//! RPE chart parser producing serializable `Chart` structures.
//!
//! Ported from `prpr/src/parse/rpe.rs` (Phira's official parser), adapted to
//! the serializable `monitor-common` data model:
//!
//! - `BpmList` / `CtrlObject` are stored by value instead of `RefCell`.
//! - `Chart.extra` and `Chart.attach_ui` are dropped (not present in
//!   `monitor-common`).
//! - `Note.hitsound` is `Option<HitSound>` (default hitsound is `None`).
//! - `macroquad::Color` -> `crate::core::Color`, `sasa::AudioClip` ->
//!   `crate::core::AudioClip` (unused here, see asset-loading note below).
//!
//! ## Asset loading (out of scope)
//!
//! `parse_rpe` only takes the RPE JSON source string, so it cannot load
//! textures, gifs or custom hitsounds (prpr does this via its `FileSystem`
//! trait). Illustration lines are preserved as `JudgeLineKind::Texture(..)`
//! with an empty `Texture` plus the original path, so a later stage can load
//! the bytes. Gif animation (`TextureGif`) and custom hitsounds are dropped
//! entirely for now.

use anyhow::{bail, Context, Result};
use serde::{Deserialize, Deserializer};
use std::{cmp::Ordering, collections::HashMap};

use crate::core::{
    colors, Anim, AnimFloat, AnimVector, BezierTween, BpmList, Chart, ChartInfo, ClampedTween,
    Color, CtrlObject, HitSound, JudgeLine, JudgeLineKind, JudgeStatus, Keyframe, Note, NoteKind,
    Object, Texture, Triple, TweenFn, TweenId, Tweenable, UIElement, EPS, HEIGHT_RATIO,
};

const RPE_WIDTH: f32 = 1350.;
const RPE_HEIGHT: f32 = 900.;
const SPEED_RATIO: f32 = 10. / 45. / HEIGHT_RATIO;

// serde is weird...
fn f32_zero() -> f32 {
    0.
}

fn f32_one() -> f32 {
    1.
}

fn i32_one() -> i32 {
    1
}

fn rpe_version_default() -> i32 {
    160
}

fn deserialize_rpe_version<'de, D>(deserializer: D) -> std::result::Result<i32, D::Error>
where
    D: Deserializer<'de>,
{
    let value: Option<serde_json::Value> = Option::deserialize(deserializer)?;
    let parsed = match value {
        Some(serde_json::Value::Number(v)) => v.as_i64().map(|it| it as i32),
        Some(serde_json::Value::String(s)) => s.parse::<i32>().ok(),
        _ => None,
    };
    Ok(parsed.unwrap_or(rpe_version_default()))
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct RPEBpmItem {
    bpm: f64,
    start_time: Triple,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct RPEEvent<T = f32> {
    #[serde(default = "f32_zero")]
    easing_left: f32,
    #[serde(default = "f32_one")]
    easing_right: f32,
    #[serde(default)]
    bezier: u8,
    #[serde(default)]
    bezier_points: [f32; 4],
    #[serde(default = "i32_one")]
    easing_type: i32,
    start: T,
    end: T,
    start_time: Triple,
    end_time: Triple,
}

impl<T> RPEEvent<T> {
    fn bezier_key(&self) -> (u16, i16, i16) {
        let p = &self.bezier_points;
        let int = |p: f32| (p * 100.).round() as i16;
        ((int(p[0]) * 100 + int(p[1])) as u16, int(p[2]), int(p[3]))
    }

    fn tween(&self, bezier_map: &BezierMap) -> TweenFn {
        let tween_id = RPE_TWEEN_MAP
            .get(self.easing_type.max(1) as usize)
            .copied()
            .unwrap_or(RPE_TWEEN_MAP[0]);
        let left = self.easing_left.clamp(0., 1.);
        let right = self.easing_right.clamp(0., 1.);
        if self.bezier != 0 {
            bezier_map[&self.bezier_key()].clone()
        } else if tween_id <= 2 || (left.abs() < EPS && (right - 1.0).abs() < EPS) || left >= right {
            TweenFn::TweenId(tween_id)
        } else {
            TweenFn::Clamped(ClampedTween::new(tween_id, left..right))
        }
    }
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct RPECtrlEvent {
    easing: u8,
    x: f64,
    #[serde(flatten)]
    value: HashMap<String, f32>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct RPEEventLayer {
    alpha_events: Option<Vec<RPEEvent>>,
    move_x_events: Option<Vec<RPEEvent>>,
    move_y_events: Option<Vec<RPEEvent>>,
    rotate_events: Option<Vec<RPEEvent>>,
    speed_events: Option<Vec<RPEEvent>>,
}

#[derive(Clone, Deserialize)]
struct RGBColor(u8, u8, u8);

impl From<RGBColor> for Color {
    fn from(RGBColor(r, g, b): RGBColor) -> Self {
        Self::from_rgba(r, g, b, 255)
    }
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct RPEExtendedEvents {
    color_events: Option<Vec<RPEEvent<RGBColor>>>,
    text_events: Option<Vec<RPEEvent<String>>>,
    scale_x_events: Option<Vec<RPEEvent>>,
    scale_y_events: Option<Vec<RPEEvent>>,
    incline_events: Option<Vec<RPEEvent>>,
    paint_events: Option<Vec<RPEEvent>>,
    gif_events: Option<Vec<RPEEvent>>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct RPENote {
    #[serde(rename = "type")]
    kind: u8,
    above: u8,
    start_time: Triple,
    end_time: Triple,
    position_x: f32,
    y_offset: f32,
    alpha: u16, // some alpha has 256...
    hitsound: Option<String>,
    size: f32,
    speed: f32,
    is_fake: u8,
    visible_time: f32,
    // NOTE: RPE also has `tint` / `tintHitEffects` / `judgeArea` fields, but
    // `monitor-common::Note` has no `color` / `fx_color` / `judge_area`, so
    // they are dropped (serde ignores the unknown keys).
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct RPEJudgeLine {
    #[serde(rename = "Name")]
    name: String,
    #[serde(rename = "Texture")]
    texture: String,
    #[serde(rename = "father")]
    parent: Option<isize>,
    // NOTE: RPE's `rotateWithFather` is dropped (monitor-common's `JudgeLine`
    // has no `rot_with_parent` field).
    event_layers: Vec<Option<RPEEventLayer>>,
    extended: Option<RPEExtendedEvents>,
    notes: Option<Vec<RPENote>>,
    is_cover: u8,
    #[serde(default)]
    z_order: i32,
    #[serde(rename = "attachUI")]
    attach_ui: Option<UIElement>,

    #[serde(default)]
    pos_control: Vec<RPECtrlEvent>,
    #[serde(default)]
    size_control: Vec<RPECtrlEvent>,
    #[serde(default)]
    alpha_control: Vec<RPECtrlEvent>,
    #[serde(default)]
    y_control: Vec<RPECtrlEvent>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct RPEMetadata {
    offset: i32,
    #[serde(rename = "RPEVersion", default = "rpe_version_default", deserialize_with = "deserialize_rpe_version")]
    rpe_version: i32,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct RPEChart {
    #[serde(rename = "META")]
    meta: RPEMetadata,
    #[serde(rename = "BPMList")]
    bpm_list: Vec<RPEBpmItem>,
    judge_line_list: Vec<RPEJudgeLine>,
}

type BezierMap = HashMap<(u16, i16, i16), TweenFn>;

#[derive(Copy, Clone)]
enum SpeedEasingMode {
    Legacy,
    Modern,
}

// RPE easing type -> monitor-common tween id (identical to prpr's map).
#[rustfmt::skip]
const RPE_TWEEN_MAP: [TweenId; 30] = {
    use crate::core::{easing_from as e, TweenMajor::*, TweenMinor::*};
    [
        2, 2, // linear
        e(Sine, Out), e(Sine, In),
        e(Quad, Out), e(Quad, In),
        e(Sine, InOut), e(Quad, InOut),
        e(Cubic, Out), e(Cubic, In),
        e(Quart, Out), e(Quart, In),
        e(Cubic, InOut), e(Quart, InOut),
        e(Quint, Out), e(Quint, In),
        e(Expo, Out), e(Expo, In),
        e(Circ, Out), e(Circ, In),
        e(Back, Out), e(Back, In),
        e(Circ, InOut), e(Back, InOut),
        e(Elastic, Out), e(Elastic, In),
        e(Bounce, Out), e(Bounce, In),
        e(Bounce, InOut), e(Elastic, InOut),
    ]
};

fn parse_events<T: Tweenable, V: Clone + Into<T>>(
    r: &mut BpmList,
    rpe: &[RPEEvent<V>],
    default: Option<T>,
    bezier_map: &BezierMap,
) -> Result<Anim<T>> {
    if rpe.is_empty() {
        return Ok(Anim::default());
    }
    let mut kfs = Vec::new();
    if let Some(default) = default {
        if rpe[0].start_time.beats() != 0.0 {
            kfs.push(Keyframe::new(0.0, default, 0));
        }
    }
    for e in rpe {
        kfs.push(Keyframe {
            time: r.time_at(&e.start_time),
            value: e.start.clone().into(),
            tween: e.tween(bezier_map),
        });
        kfs.push(Keyframe::new(r.time_at(&e.end_time), e.end.clone().into(), 0));
    }
    Ok(Anim::new(kfs))
}

fn speed_linear_tween(start_speed: f32, end_speed: f32) -> TweenFn {
    if (start_speed - end_speed).abs() < EPS {
        TweenFn::TweenId(2)
    } else if start_speed.abs() > end_speed.abs() {
        TweenFn::Clamped(ClampedTween::new(7 /*quadOut*/, 0.0..(1. - end_speed / start_speed)))
    } else {
        TweenFn::Clamped(ClampedTween::new(6 /*quadIn*/, (start_speed / end_speed)..1.))
    }
}

// NOTE: prpr computes a `SpeedIntegralTween` here (the integral of the easing
// curve). monitor-common's `TweenFn` has no integral-tween variant, so we fall
// back to the linear approximation prpr itself uses when the integral is
// degenerate. This only affects RPE speed events with `easingType > 1`.
fn speed_segment_tween(start_speed: f32, end_speed: f32) -> (TweenFn, f32) {
    (speed_linear_tween(start_speed, end_speed), (start_speed + end_speed) / 2.)
}

fn push_speed_kf(
    kfs: &mut Vec<Keyframe<f32>>,
    height: &mut f32,
    start_time: f32,
    end_time: f32,
    tween: TweenFn,
    factor: f32,
) {
    if end_time - start_time <= EPS {
        return;
    }
    if let Some(last) = kfs.last_mut() {
        if (last.time - start_time).abs() < EPS {
            last.value = *height;
            last.tween = tween;
        } else {
            kfs.push(Keyframe {
                time: start_time,
                value: *height,
                tween,
            });
        }
    }
    *height += factor * (end_time - start_time);
}

fn parse_speed_events(
    r: &mut BpmList,
    rpe: &[RPEEventLayer],
    // Unused because integral-tween speed easing (easingType > 1) falls back to
    // linear; see `speed_segment_tween`.
    _bezier_map: &BezierMap,
    max_time: f32,
    _mode: SpeedEasingMode,
) -> Result<AnimFloat> {
    let layers: Vec<_> = rpe.iter().filter_map(|it| it.speed_events.as_ref()).collect();
    if layers.is_empty() {
        return Ok(AnimFloat::default());
    }
    let mut anis = Vec::new();
    for layer in layers {
        if layer.is_empty() {
            continue;
        }
        let mut events: Vec<_> = layer.iter().collect();
        events.sort_by(|a, b| {
            a.start_time
                .beats()
                .partial_cmp(&b.start_time.beats())
                .unwrap_or(Ordering::Equal)
        });

        let mut kfs = vec![Keyframe::new(0.0, 0.0, 2)];
        let mut height = 0f32;

        let mut cursor = 0f32;
        let mut last_speed = 0f32;
        for event in events {
            let start_time = r.time_at(&event.start_time).max(cursor);
            let end_time = r.time_at(&event.end_time).max(start_time);
            let start_speed = event.start * SPEED_RATIO;
            let end_speed = event.end * SPEED_RATIO;

            push_speed_kf(&mut kfs, &mut height, cursor, start_time, TweenFn::TweenId(2), last_speed);
            if end_time > start_time + EPS {
                if event.easing_type == 0 {
                    push_speed_kf(&mut kfs, &mut height, start_time, end_time, TweenFn::TweenId(2), start_speed);
                } else if event.easing_type <= 1 {
                    if start_speed * end_speed < 0. {
                        let x = start_speed / (start_speed - end_speed);
                        let mid = start_time + (end_time - start_time) * x;
                        for (st, en, start, end) in [(start_time, mid, start_speed, 0.), (mid, end_time, 0., end_speed)] {
                            let factor = (start + end) / 2.;
                            let tween = speed_linear_tween(start, end);
                            push_speed_kf(&mut kfs, &mut height, st, en, tween, factor);
                        }
                    } else {
                        let factor = (start_speed + end_speed) / 2.;
                        let tween = speed_linear_tween(start_speed, end_speed);
                        push_speed_kf(&mut kfs, &mut height, start_time, end_time, tween, factor);
                    }
                } else {
                    let (tween, factor) = speed_segment_tween(start_speed, end_speed);
                    push_speed_kf(&mut kfs, &mut height, start_time, end_time, tween, factor);
                }
            }
            cursor = end_time;
            last_speed = end_speed;
        }

        push_speed_kf(&mut kfs, &mut height, cursor, max_time, TweenFn::TweenId(2), last_speed);
        if let Some(last) = kfs.last() {
            if (last.time - max_time).abs() > EPS {
                kfs.push(Keyframe::new(max_time, height, 0));
            }
        }
        anis.push(AnimFloat::new(kfs));
    }
    if anis.is_empty() {
        return Ok(AnimFloat::default());
    }
    Ok(AnimFloat::chain(anis))
}

fn parse_speed_events_legacy(r: &mut BpmList, rpe: &[RPEEventLayer], max_time: f32) -> Result<AnimFloat> {
    let rpe: Vec<_> = rpe.iter().filter_map(|it| it.speed_events.as_ref()).collect();
    if rpe.is_empty() {
        return Ok(AnimFloat::default());
    }
    let anis: Vec<_> = rpe
        .into_iter()
        .filter_map(|it| {
            if it.is_empty() {
                return None;
            }
            let mut kfs = Vec::new();
            for e in it {
                kfs.push(Keyframe::new(r.time_at(&e.start_time), e.start, 2));
                kfs.push(Keyframe::new(r.time_at(&e.end_time), e.end, 0));
            }
            Some(AnimFloat::new(kfs))
        })
        .collect();
    if anis.is_empty() {
        return Ok(AnimFloat::default());
    }
    let mut pts: Vec<f32> = anis.iter().flat_map(|it| it.keyframes.iter().map(|it| it.time)).collect();
    pts.push(max_time);
    pts.sort_by(|a, b| a.partial_cmp(b).unwrap_or(Ordering::Equal));
    pts.dedup();
    let mut sani = AnimFloat::chain(anis);
    sani.map_value(|v| v * SPEED_RATIO);
    for i in 0..(pts.len() - 1) {
        let now_time = pts[i];
        let end_time = pts[i + 1];
        sani.set_time(now_time);
        let speed = sani.now();
        sani.set_time(end_time - 1e-4);
        let end_speed = sani.now();
        if speed.signum() * end_speed.signum() < 0. {
            pts.push(now_time + (end_time - now_time) * (speed / (speed - end_speed)));
        }
    }
    pts.sort_by(|a, b| a.partial_cmp(b).unwrap_or(Ordering::Equal));
    pts.dedup();
    let mut kfs = Vec::new();
    let mut height = 0f32;
    for i in 0..(pts.len() - 1) {
        let now_time = pts[i];
        let end_time = pts[i + 1];
        sani.set_time(now_time);
        let speed = sani.now();
        // this can affect a lot! do not use end_time...
        // using end_time causes Hold tween (x |-> 0) to be recognized as Linear tween (x |-> x)
        sani.set_time(end_time - 1e-4);
        let end_speed = sani.now();
        kfs.push(if (speed - end_speed).abs() < EPS {
            Keyframe::new(now_time, height, 2)
        } else if speed.abs() > end_speed.abs() {
            Keyframe {
                time: now_time,
                value: height,
                tween: TweenFn::Clamped(ClampedTween::new(7 /*quadOut*/, 0.0..(1. - end_speed / speed))),
            }
        } else {
            Keyframe {
                time: now_time,
                value: height,
                tween: TweenFn::Clamped(ClampedTween::new(6 /*quadIn*/, (speed / end_speed)..1.)),
            }
        });
        height += (speed + end_speed) * (end_time - now_time) / 2.;
    }
    if kfs.is_empty() {
        return Ok(Anim::default());
    }
    kfs.push(Keyframe::new(max_time, height, 0));
    Ok(AnimFloat::new(kfs))
}

fn parse_notes(r: &mut BpmList, rpe: Vec<RPENote>, height: &mut AnimFloat) -> Result<Vec<Note>> {
    let mut notes = Vec::new();
    for note in rpe {
        let time = r.time_at(&note.start_time);
        height.set_time(time);
        let note_height = height.now();
        let y_offset = note.y_offset * 2. / RPE_HEIGHT * note.speed;
        let kind = match note.kind {
            1 => NoteKind::Click,
            2 => {
                let end_time = r.time_at(&note.end_time);
                height.set_time(end_time);
                NoteKind::Hold {
                    end_time,
                    end_height: height.now(),
                }
            }
            3 => NoteKind::Flick,
            4 => NoteKind::Drag,
            _ => bail!("unknown-note-type: {}", note.kind),
        };
        let hitsound = match note.hitsound {
            Some(s) => Some(if s == "flick.mp3" {
                HitSound::Flick
            } else if s == "tap.mp3" {
                HitSound::Click
            } else if s == "drag.mp3" {
                HitSound::Drag
            } else {
                // Custom hitsound. Asset loading is out of scope, so the
                // `Chart.hitsounds` map is left empty for the caller to fill.
                HitSound::Custom(s)
            }),
            None => None,
        };
        notes.push(Note {
            object: Object {
                alpha: if note.visible_time >= time {
                    if note.alpha >= 255 {
                        AnimFloat::default()
                    } else {
                        AnimFloat::fixed(note.alpha as f32 / 255.)
                    }
                } else {
                    let alpha = note.alpha.min(255) as f32 / 255.;
                    AnimFloat::new(vec![Keyframe::new(0.0, 0.0, 0), Keyframe::new(time - note.visible_time, alpha, 0)])
                },
                translation: AnimVector::new(
                    AnimFloat::fixed(note.position_x / (RPE_WIDTH / 2.)),
                    AnimFloat::fixed(y_offset),
                ),
                scale: AnimVector::new(AnimFloat::fixed(note.size), AnimFloat::fixed(note.size)),
                ..Default::default()
            },
            kind,
            hitsound,
            time,
            height: note_height,
            speed: note.speed,
            above: note.above == 1,
            multiple_hint: false,
            fake: note.is_fake != 0,
            judge: JudgeStatus::NotJudged,
        });
    }
    Ok(notes)
}

fn parse_ctrl_events(rpe: &[RPECtrlEvent], key: &str) -> AnimFloat {
    let vals: Vec<_> = rpe.iter().map(|it| it.value.get(key).copied().unwrap_or_default()).collect();
    if rpe.is_empty() || (rpe.len() == 2 && rpe[0].easing == 1 && (vals[0] - 1.).abs() < 1e-4) {
        return AnimFloat::default();
    }
    // In RPE, each control event's easing governs the interval ending at that
    // event's x, not starting from it. The Anim system uses kf[i].tween for
    // the interval [kf[i], kf[i+1]], so we shift the tween assignment: each
    // keyframe gets the tween from the next event.
    let tweens: Vec<TweenFn> = rpe
        .iter()
        .skip(1)
        .map(|it| {
            TweenFn::TweenId(
                RPE_TWEEN_MAP
                    .get(it.easing.max(1) as usize)
                    .copied()
                    .unwrap_or(RPE_TWEEN_MAP[0]),
            )
        })
        .chain(std::iter::once(TweenFn::TweenId(0)))
        .collect();
    AnimFloat::new(
        rpe.iter()
            .zip(vals)
            .zip(tweens)
            .map(|((it, val), tween)| Keyframe {
                time: it.x as f32,
                value: val,
                tween,
            })
            .collect(),
    )
}

fn parse_judge_line(
    r: &mut BpmList,
    rpe: RPEJudgeLine,
    max_time: f32,
    speed_mode: SpeedEasingMode,
    use_rpe_170_speed: bool,
    bezier_map: &BezierMap,
) -> Result<JudgeLine> {
    let event_layers: Vec<_> = rpe.event_layers.into_iter().flatten().collect();

    fn events_with_factor(
        r: &mut BpmList,
        event_layers: &[RPEEventLayer],
        get: impl Fn(&RPEEventLayer) -> &Option<Vec<RPEEvent>>,
        factor: f32,
        desc: &str,
        bezier_map: &BezierMap,
    ) -> Result<AnimFloat> {
        let anis: Vec<_> = event_layers
            .iter()
            .filter_map(|it| get(it).as_ref().map(|es| parse_events(r, es, None, bezier_map)))
            .collect::<Result<_>>()
            .with_context(|| format!("failed to parse {desc} events"))?;
        let mut res = AnimFloat::chain(anis);
        if res.is_default() {
            return Ok(AnimFloat::fixed(0.0));
        }
        res.map_value(|v| v * factor);
        Ok(res)
    }

    fn parse_scale(
        r: &mut BpmList,
        opt: &Option<Vec<RPEEvent>>,
        factor: f32,
        bezier_map: &BezierMap,
    ) -> Result<AnimFloat> {
        let mut res = opt
            .as_ref()
            .map(|it| parse_events(r, it, None, bezier_map))
            .transpose()?
            .unwrap_or_default();
        res.map_value(|v| v * factor);
        Ok(res)
    }

    let mut height = if use_rpe_170_speed {
        parse_speed_events(r, &event_layers, bezier_map, max_time, speed_mode)?
    } else {
        parse_speed_events_legacy(r, &event_layers, max_time)?
    };
    let notes = parse_notes(r, rpe.notes.unwrap_or_default(), &mut height)?;

    let mut line = JudgeLine {
        object: Object {
            alpha: events_with_factor(r, &event_layers, |it| &it.alpha_events, 1. / 255., "alpha", bezier_map)?,
            rotation: events_with_factor(r, &event_layers, |it| &it.rotate_events, -1., "rotate", bezier_map)?,
            translation: AnimVector::new(
                events_with_factor(r, &event_layers, |it| &it.move_x_events, 2. / RPE_WIDTH, "move X", bezier_map)?,
                events_with_factor(r, &event_layers, |it| &it.move_y_events, 2. / RPE_HEIGHT, "move Y", bezier_map)?,
            ),
            scale: {
                let factor = if rpe.texture == "line.png" { 1. } else { 2. / RPE_WIDTH };
                rpe.extended
                    .as_ref()
                    .map(|e| -> Result<_> {
                        Ok(AnimVector::new(
                            parse_scale(
                                r,
                                &e.scale_x_events,
                                factor
                                    * if rpe.texture == "line.png"
                                        && e.text_events.as_ref().map_or(true, |it| it.is_empty())
                                        && rpe.attach_ui.is_none()
                                    {
                                        0.5
                                    } else {
                                        1.
                                    },
                                bezier_map,
                            )?,
                            parse_scale(r, &e.scale_y_events, factor, bezier_map)?,
                        ))
                    })
                    .transpose()?
                    .unwrap_or_default()
            },
        },
        ctrl_obj: CtrlObject {
            alpha: parse_ctrl_events(&rpe.alpha_control, "alpha"),
            size: parse_ctrl_events(&rpe.size_control, "size"),
            pos: parse_ctrl_events(&rpe.pos_control, "pos"),
            y: parse_ctrl_events(&rpe.y_control, "y"),
        },
        height,
        incline: if let Some(events) = rpe.extended.as_ref().and_then(|e| e.incline_events.as_ref()) {
            parse_events(r, events, Some(0.), bezier_map).context("failed to parse incline events")?
        } else {
            AnimFloat::default()
        },
        notes,
        kind: if rpe.texture == "line.png" {
            if let Some(events) = rpe.extended.as_ref().and_then(|e| e.paint_events.as_ref()) {
                JudgeLineKind::Paint(
                    parse_events(r, events, Some(-1.), bezier_map).context("failed to parse paint events")?,
                )
            } else if let Some(extended) = rpe.extended.as_ref() {
                if let Some(events) = extended.text_events.as_ref() {
                    JudgeLineKind::Text(
                        parse_events(r, events, Some(String::new()), bezier_map)
                            .context("failed to parse text events")?,
                    )
                } else {
                    JudgeLineKind::Normal
                }
            } else {
                JudgeLineKind::Normal
            }
        } else {
            // Illustration texture / gif. Asset loading is out of scope for the
            // serialized parser; preserve the texture path so a later stage can
            // load it. Gif animation (`TextureGif`) is not yet supported.
            JudgeLineKind::Texture(Texture::empty(), rpe.texture.clone())
        },
        color: if let Some(events) = rpe.extended.as_ref().and_then(|e| e.color_events.as_ref()) {
            parse_events(r, events, Some(colors::WHITE), bezier_map).context("failed to parse color events")?
        } else {
            Anim::default()
        },
        parent: {
            let parent = rpe.parent.unwrap_or(-1);
            if parent == -1 {
                None
            } else {
                Some(parent as usize)
            }
        },
        z_index: rpe.z_order,
        show_below: rpe.is_cover != 1,
        attach_ui: rpe.attach_ui,
    };
    // Replicates prpr's `JudgeLineCache::new`, which sorts notes to fix their
    // structural order / id assignment.
    line.sort_notes();
    Ok(line)
}

fn add_bezier<T>(map: &mut BezierMap, event: &RPEEvent<T>) {
    if event.bezier != 0 {
        let p = &event.bezier_points;
        let int = |p: f32| (p * 100.).round() as i16;
        map.entry(((int(p[0]) * 100 + int(p[1])) as u16, int(p[2]), int(p[3])))
            .or_insert_with(|| TweenFn::Bezier(BezierTween::new((p[0], p[1]), (p[2], p[3]))));
    }
}

macro_rules! process_bezier {
    ($event_layer:expr, $map:expr, $($field:ident),*) => {
        $(
            for event in $event_layer.$field.iter().flatten() {
                add_bezier($map, event);
            }
        )*
    };
}

fn get_bezier_map(rpe: &RPEChart) -> BezierMap {
    let mut map = HashMap::new();
    for line in &rpe.judge_line_list {
        for event_layer in line.event_layers.iter().flatten() {
            process_bezier!(event_layer, &mut map, alpha_events, move_x_events, move_y_events, rotate_events);
        }
        if let Some(ext_layer) = &line.extended {
            process_bezier!(ext_layer, &mut map, paint_events, scale_x_events, scale_y_events, gif_events, incline_events, text_events, color_events);
        }
    }
    map
}

fn compute_max_time(r: &mut BpmList, lines: &[RPEJudgeLine]) -> f32 {
    let mut max = 0f32;
    for line in lines {
        if let Some(notes) = &line.notes {
            for note in notes {
                max = max.max(r.time_at(&note.end_time));
            }
        }
        for layer in line.event_layers.iter().flatten() {
            for events in [
                &layer.alpha_events,
                &layer.move_x_events,
                &layer.move_y_events,
                &layer.rotate_events,
            ] {
                if let Some(events) = events {
                    for e in events {
                        max = max.max(r.time_at(&e.end_time));
                    }
                }
            }
        }
        if let Some(ext) = &line.extended {
            for events in [&ext.scale_x_events, &ext.scale_y_events] {
                if let Some(events) = events {
                    for e in events {
                        max = max.max(r.time_at(&e.end_time));
                    }
                }
            }
            if let Some(events) = &ext.text_events {
                for e in events {
                    max = max.max(r.time_at(&e.end_time));
                }
            }
        }
    }
    max
}

fn has_cycle(line: &JudgeLine, lines: &[JudgeLine], visited: &mut Vec<usize>) -> Option<usize> {
    if let Some(parent_index) = line.parent {
        if visited.contains(&parent_index) {
            return Some(parent_index);
        }
        visited.push(parent_index);
        return has_cycle(&lines[parent_index], lines, visited);
    }
    None
}

fn process_lines(v: &mut [JudgeLine]) {
    let mut times = Vec::new();
    // TODO optimize using k-merge sort
    let sorts = v
        .iter()
        .map(|line| {
            let mut idx: Vec<usize> = (0..line.notes.len()).collect();
            idx.sort_by(|&a, &b| line.notes[a].time.partial_cmp(&line.notes[b].time).unwrap_or(Ordering::Equal));
            idx
        })
        .collect::<Vec<_>>();
    for (line, idx) in v.iter().zip(sorts.iter()) {
        let notes = &line.notes;
        let mut i = 0;
        while i < notes.len() {
            times.push(notes[idx[i]].time);
            let mut j = i + 1;
            while j < notes.len() && notes[idx[j]].time == notes[idx[i]].time {
                j += 1;
            }
            if j != i + 1 {
                times.push(notes[idx[i]].time);
            }
            i = j;
        }
    }
    times.sort_by(|a, b| a.partial_cmp(b).unwrap_or(Ordering::Equal));
    let mut mt = Vec::new();
    if !times.is_empty() {
        for i in 0..(times.len() - 1) {
            // since times are generated in the same way, theoretically we can compare them directly
            if times[i] == times[i + 1] && (i == 0 || times[i - 1] != times[i]) {
                mt.push(times[i]);
            }
        }
    }
    for (line, idx) in v.iter_mut().zip(sorts.iter()) {
        let mut i = 0;
        for id in idx {
            let note = &mut line.notes[*id];
            let time = note.time;
            while i < mt.len() && mt[i] < time {
                i += 1;
            }
            if i < mt.len() && mt[i] == time {
                note.multiple_hint = true;
            }
        }
    }
}

/// Parse an RPE chart JSON document into a serializable `Chart`.
///
/// `use_rpe_170_speed` selects the RPE 1.7.0 speed-event interpretation (see
/// the `useRpe170Speed` flag in `info.yml`); it is not part of `ChartInfo`.
pub fn parse_rpe(source: &str, use_rpe_170_speed: bool) -> anyhow::Result<Chart> {
    let rpe: RPEChart = serde_json::from_str(source).context("failed to parse RPE JSON")?;
    let speed_mode = if rpe.meta.rpe_version >= 170 {
        SpeedEasingMode::Modern
    } else {
        SpeedEasingMode::Legacy
    };
    let bezier_map = get_bezier_map(&rpe);
    let mut r = BpmList::new(
        rpe.bpm_list
            .into_iter()
            .map(|it| (it.start_time.beats(), it.bpm as f32))
            .collect(),
    );
    let max_time = compute_max_time(&mut r, &rpe.judge_line_list) + 1.0;
    let mut lines = Vec::new();
    for (id, rpe_line) in rpe.judge_line_list.into_iter().enumerate() {
        let name = rpe_line.name.clone();
        lines.push(
            parse_judge_line(&mut r, rpe_line, max_time, speed_mode, use_rpe_170_speed, &bezier_map)
                .with_context(|| format!("failed to parse judge line {id} ({name})"))?,
        );
    }
    for (i, line) in lines.iter().enumerate() {
        let mut visited = vec![i];
        if let Some(line) = has_cycle(line, &lines, &mut visited) {
            bail!("found infinite recursive parent relations, line {line}");
        }
    }
    process_lines(&mut lines);
    r.reset();
    Ok(Chart::new(rpe.meta.offset as f32 / 1000.0, lines, r))
}

/// Parse Phira's `info.yml` into `ChartInfo`.
pub fn parse_info(source: &str) -> anyhow::Result<ChartInfo> {
    serde_yaml::from_str(source).context("failed to parse info.yml")
}

/// Read the `useRpe170Speed` flag from `info.yml`.
///
/// This field exists in Phira's `ChartInfo` but is missing from
/// `monitor-common`'s `ChartInfo`, so it is exposed separately for callers of
/// `parse_rpe`.
pub fn parse_use_rpe_170_speed(source: &str) -> anyhow::Result<bool> {
    #[derive(Deserialize)]
    #[serde(rename_all = "camelCase")]
    struct Flags {
        #[serde(default)]
        use_rpe_170_speed: Option<bool>,
    }
    let flags: Flags = serde_yaml::from_str(source).context("failed to parse info.yml")?;
    Ok(flags.use_rpe_170_speed.unwrap_or(false))
}

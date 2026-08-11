//! Native adapter — Phase D stubs (design §17.2, §14.7).
//!
//! Every function here is a **stub**: it documents the native surface the Tauri
//! shell must provide and degrades silently until the Owner supplies the
//! platform credentials / toolchains. It is registered as Tauri commands so
//! the frontend can call `invoke('secure_store_set', …)` etc. today and get a
//! no-op rather than a hard failure.
//!
//! Responsibilities (design §17.2):
//! - **Secure credential storage** — must end up in the OS keychain:
//!   Windows Credential Manager (DPAPI) / Android Keystore. The current stub
//!   is a no-op; `tauri-plugin-store` is registered for *local device prefs*
//!   (JSON) but must NEVER hold secrets at rest in plaintext.
//! - **Remote push registration** — FCM (Android) / WNS (Windows) so push can
//!   arrive after a full app exit (design §14.7). Needs Owner credentials:
//!   `google-services.json` (FCM) and the WNS package SID + client secret.
//! - **Local notification presentation** — via `tauri-plugin-notification`.
//! - **Deep link** — `ppf://` URLs are forwarded to the webview in `lib.rs`
//!   (`ppf-deeplink` event).
//! - **Lifecycle** — focus/blur emitted in `lib.rs` under `ppf:lifecycle`.
//! - **Device preference** — persistable via `tauri-plugin-store`.
//!
//! TODO(owner): replace stubs with real implementations once credentials and
//! the native toolchain are available (CI-only, see README.md).

use serde_json::Value;
use tauri::{AppHandle, Manager};

/// Log a stub invocation to stderr (the `log`/`tracing` crates are not wired
/// yet — swap when the shell is finalized).
fn log_stub(handle: &AppHandle, msg: &str) {
    eprintln!("[phira-plus:native-adapter] {msg} (app: {:?})", handle.package_info().name);
}

/// Read a secret from secure storage.
///
/// Stub: returns `None`. Real implementation must use the OS keychain
/// (Windows Credential Manager / Android Keystore) so tokens are never at rest
/// in plaintext. Never persist secrets via `tauri-plugin-store`.
#[tauri::command]
pub fn secure_store_get(handle: AppHandle, key: String) -> Option<Value> {
    log_stub(&handle, &format!("secure_store_get({key}) — stub returns None"));
    None
}

/// Store a secret in secure storage.
///
/// Stub: no-op returning `Ok`. See `secure_store_get` for the real target.
#[tauri::command]
pub fn secure_store_set(handle: AppHandle, key: String, value: Value) -> Result<(), String> {
    log_stub(&handle, &format!("secure_store_set({key}) — stub no-op"));
    let _ = value;
    Ok(())
}

/// Delete a secret from secure storage.
///
/// Stub: no-op returning `Ok`.
#[tauri::command]
pub fn secure_store_delete(handle: AppHandle, key: String) -> Result<(), String> {
    log_stub(&handle, &format!("secure_store_delete({key}) — stub no-op"));
    Ok(())
}

/// Register a remote-push token with the platform push service.
///
/// Stub: logs the token length only. Real implementation (design §14.7):
/// - Android: hand the token to FCM (requires `google-services.json`).
/// - Windows: hand the token to WNS (requires package SID + client secret).
/// Both are OWNER credentials and are not present in this scaffold.
#[tauri::command]
pub fn register_remote_push(handle: AppHandle, token: String) -> Result<(), String> {
    log_stub(
        &handle,
        &format!("register_remote_push(token.len = {}) — FCM/WNS requires Owner credentials", token.len()),
    );
    Ok(())
}

/// Present a local notification via `tauri-plugin-notification`.
///
/// Stub: logs only. Real implementation should call
/// `tauri_plugin_notification::NotificationExt::notification().builder()…`.
#[tauri::command]
pub fn show_local_notification(handle: AppHandle, title: String, body: Option<String>) -> Result<(), String> {
    log_stub(&handle, &format!("show_local_notification({title}) — stub no-op"));
    let _ = body;
    Ok(())
}

/// Read device preferences (local-only, design §17.2).
///
/// Stub: returns an empty map. Real implementation reads a `tauri-plugin-store`
/// store keyed by the device (theme, window size, last route, …).
#[tauri::command]
pub fn get_device_preferences(handle: AppHandle) -> Value {
    log_stub(&handle, "get_device_preferences — stub returns {{}}");
    serde_json::json!({})
}

/// Write a device preference (local-only).
///
/// Stub: no-op returning `Ok`.
#[tauri::command]
pub fn set_device_preferences(handle: AppHandle, key: String, value: Value) -> Result<(), String> {
    log_stub(&handle, &format!("set_device_preferences({key}) — stub no-op"));
    let _ = value;
    Ok(())
}

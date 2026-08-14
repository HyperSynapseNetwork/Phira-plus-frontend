//! Native platform adapter.
//!
//! This adapter deliberately separates implemented local capabilities from
//! platform/Owner-dependent ones. Unavailable capabilities fail explicitly so
//! callers do not mistake a no-op for a successful security or push operation.
//!
//! Responsibilities (design §17.2):
//! - **Secure credential storage** — must end up in the OS keychain:
//!   Windows Credential Manager (DPAPI) / Android Keystore. The current stub
//!   is a no-op; `tauri-plugin-store` is registered for *local device prefs*
//!   (JSON) but must NEVER hold secrets at rest in plaintext.
//! - **Remote push registration** — FCM (Android) / WNS (Windows) so push can
//!   arrive after a full app exit (design §14.7). Needs Owner credentials:
//!   `google-services.json` (FCM) and the WNS package SID + client secret.
//! - **Local notification presentation** — implemented via
//!   `tauri-plugin-notification`.
//! - **Deep link** — `ppf://` URLs are forwarded to the webview in `lib.rs`
//!   (`ppf-deeplink` event).
//! - **Lifecycle** — focus/blur emitted in `lib.rs` under `ppf:lifecycle`.
//! - **Device preference** — implemented via `tauri-plugin-store`.
//!
use serde_json::Value;
use tauri::{AppHandle, Manager};
use tauri_plugin_notification::NotificationExt;
use tauri_plugin_store::StoreExt;

const UNSUPPORTED: &str = "UNSUPPORTED: native capability is not available in this build";
const NOT_CONFIGURED: &str = "NOT_CONFIGURED: remote push credentials are not configured";

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
pub fn secure_store_get(handle: AppHandle, key: String) -> Result<Option<Value>, String> {
    log_stub(&handle, &format!("secure_store_get({key}) — stub returns None"));
    Err(UNSUPPORTED.to_string())
}

/// Store a secret in secure storage.
///
/// Unsupported until a platform keychain bridge is included. See
/// `secure_store_get` for the required security boundary.
#[tauri::command]
pub fn secure_store_set(handle: AppHandle, key: String, value: Value) -> Result<(), String> {
    log_stub(&handle, &format!("secure_store_set({key}) — stub no-op"));
    let _ = value;
    Err(UNSUPPORTED.to_string())
}

/// Delete a secret from secure storage.
///
/// Unsupported until a platform keychain bridge is included.
#[tauri::command]
pub fn secure_store_delete(handle: AppHandle, key: String) -> Result<(), String> {
    log_stub(&handle, &format!("secure_store_delete({key}) — stub no-op"));
    Err(UNSUPPORTED.to_string())
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
    Err(NOT_CONFIGURED.to_string())
}

/// Present a local notification via `tauri-plugin-notification`.
///
#[tauri::command]
pub fn show_local_notification(handle: AppHandle, title: String, body: Option<String>) -> Result<(), String> {
    let mut builder = handle.notification().builder().title(title);
    if let Some(body) = body {
        builder = builder.body(body);
    }
    builder.show().map_err(|error| format!("NOTIFICATION_FAILED: {error}"))
}

/// Read device preferences (local-only, design §17.2).
///
#[tauri::command]
pub fn get_device_preferences(handle: AppHandle) -> Result<Value, String> {
    let store = handle
        .store("device-preferences.json")
        .map_err(|error| format!("STORE_UNAVAILABLE: {error}"))?;
    Ok(store.get("preferences").unwrap_or_else(|| serde_json::json!({})))
}

/// Write a device preference (local-only).
///
#[tauri::command]
pub fn set_device_preferences(handle: AppHandle, key: String, value: Value) -> Result<(), String> {
    let store = handle
        .store("device-preferences.json")
        .map_err(|error| format!("STORE_UNAVAILABLE: {error}"))?;
    let mut preferences = store
        .get("preferences")
        .and_then(|value| value.as_object().cloned())
        .unwrap_or_default();
    preferences.insert(key, value);
    store.set("preferences", Value::Object(preferences));
    store.save().map_err(|error| format!("STORE_SAVE_FAILED: {error}"))
}

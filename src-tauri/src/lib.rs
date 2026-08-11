// Phira+ — Tauri 2 app shell entry point (design §17).
//
// Phase D scaffold. The desktop/mobile shell shares a single `run()`; on
// Android the `tauri::mobile_entry_point` shim is injected by tauri-build so
// this crate compiles to a staticlib for the Gradle build.

mod native_adapter;

use tauri::{Emitter, WindowEvent};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            native_adapter::secure_store_get,
            native_adapter::secure_store_set,
            native_adapter::secure_store_delete,
            native_adapter::register_remote_push,
            native_adapter::show_local_notification,
            native_adapter::get_device_preferences,
            native_adapter::set_device_preferences,
        ])
        .on_window_event(|window, event| {
            // Lifecycle events (design §17.2): surface focus/blur to the
            // webview so the frontend can pause/resume background work.
            if let WindowEvent::Focused(focused) = event {
                let _ = window.emit(
                    "ppf:lifecycle",
                    serde_json::json!({ "type": if *focused { "focused" } else { "blurred" } }),
                );
            }
        })
        .setup(|app| {
            // Deep link (design §17.2): forward every `ppf://` URL to the
            // webview under `ppf-deeplink`; the Nuxt frontend routes on it.
            // Works on desktop (registered schemes) and Android (intent
            // filters merged by the plugin).
            let handle = app.handle().clone();
            use tauri_plugin_deep_link::DeepLinkExt;
            app.deep_link().on_open_url(move |event| {
                if let Some(url) = event.urls().first() {
                    let _ = handle.emit("ppf-deeplink", url.to_string());
                }
            });
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running the Phira+ Tauri application");
}

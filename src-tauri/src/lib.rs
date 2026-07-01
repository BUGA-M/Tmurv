// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/

use std::fs;
use std::path::Path;
use std::sync::atomic::{AtomicBool, Ordering};
use tauri::{AppHandle, Manager, State};
use tauri::tray::{TrayIconBuilder, MouseButton, MouseButtonState, TrayIconEvent};
use tauri::menu::{Menu, MenuItem, PredefinedMenuItem};

struct AppState {
    minimize_to_tray: AtomicBool,
}

#[tauri::command]
fn set_minimize_to_tray(state: State<'_, AppState>, enabled: bool) {
    state.minimize_to_tray.store(enabled, Ordering::Relaxed);
}

#[tauri::command]
fn upload_sound(app: AppHandle, file_path: String) -> Result<String, String> {
    let source_path = Path::new(&file_path);
    if !source_path.exists() || !source_path.is_file() {
        return Err("Le fichier source n'existe pas ou n'est pas un fichier.".into());
    }

    let kind = infer::get_from_path(source_path)
        .map_err(|e| format!("Erreur lors de la lecture du fichier: {}", e))?;
    
    let is_valid_audio = match kind {
        Some(k) => matches!(k.mime_type(), "audio/mpeg" | "audio/x-wav" | "audio/wav"),
        None => false,
    };

    if !is_valid_audio {
        return Err("Format de fichier invalide. Seuls les fichiers audio valides (MP3, WAV) sont acceptés (Magic Number mismatch).".into());
    }

    let file_name = source_path
        .file_name()
        .ok_or("Nom de fichier invalide")?
        .to_string_lossy()
        .into_owned();

    let safe_file_name = file_name.replace("/", "").replace("\\", "");

    let app_config_dir = app.path().app_config_dir().map_err(|_| "Impossible d'obtenir le dossier de configuration".to_string())?;
    let sounds_dir = app_config_dir.join("sounds");

    if !sounds_dir.exists() {
        fs::create_dir_all(&sounds_dir).map_err(|e| format!("Impossible de créer le dossier des sons: {}", e))?;
    }

    let dest_path = sounds_dir.join(&safe_file_name);
    fs::copy(source_path, &dest_path).map_err(|e| format!("Erreur lors de la copie du fichier: {}", e))?;

    Ok(safe_file_name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_opener::init())
        .manage(AppState {
            minimize_to_tray: AtomicBool::new(true), // Default is true
        })
        .invoke_handler(tauri::generate_handler![upload_sound, set_minimize_to_tray])
        .setup(|app| {
            let quit_i = MenuItem::with_id(app, "quit", "Quitter", true, None::<&str>)?;
            let show_i = MenuItem::with_id(app, "show", "Afficher l'application", true, None::<&str>)?;
            let separator = PredefinedMenuItem::separator(app)?;
            let menu = Menu::with_items(app, &[&show_i, &separator, &quit_i])?;

            let _tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .tooltip("Tmurv - Pomodoro Timer")
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "quit" => {
                        app.exit(0);
                    }
                    "show" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                })
                .build(app)?;

            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                let app = window.app_handle();
                let state = app.state::<AppState>();
                if state.minimize_to_tray.load(Ordering::Relaxed) {
                    api.prevent_close();
                    window.hide().unwrap();
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

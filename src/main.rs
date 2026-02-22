mod api;
mod auth;
mod cli;
mod clients;
mod common;
mod db;
mod models;
mod service;
mod utils;

use clap::Parser;
use cli::{Cli, Commands, DevCommand, PrdCommand};
use common::AppResult;
use service::CeladonService;
use utils::{print_json, storage_dir};

#[tokio::main]
async fn main() -> AppResult<()> {
    let _ = dotenvy::dotenv();
    let cli = Cli::parse();
    let storage = storage_dir();

    let output = match cli.command {
        Commands::Serve { port } => {
            let pool = match std::env::var("DATABASE_URL") {
                Ok(url) => Some(
                    db::init_pool(&url)
                        .await
                        .map_err(|e| format!("数据库: {e}"))?,
                ),
                Err(_) => None,
            };
            api::serve(storage, port, pool).await?;
            return Ok(());
        }
        command => {
            let mut service = CeladonService::load(storage).await?;
            match command {
                Commands::Start { idea, name } => service.start(idea, name).await?,
                Commands::Idea { session_id, text } => {
                    service.append_idea(&session_id, text).await?
                }
                Commands::Prd { command } => match command {
                    PrdCommand::Generate { session_id } => {
                        service.generate_prd(&session_id).await?
                    }
                },
                Commands::Dev { command } => match command {
                    DevCommand::Run {
                        session_id,
                        instruction,
                        dry_run,
                    } => service.run_dev(&session_id, instruction, dry_run).await?.0,
                },
                Commands::Deploy { session_id, env } => {
                    service.run_deploy(&session_id, env).await?
                }
                Commands::Status { session_id } => service.status(&session_id)?,
                Commands::Serve { .. } => unreachable!(),
            }
        }
    };

    print_json(&output)?;
    Ok(())
}

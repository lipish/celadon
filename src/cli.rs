use clap::{Parser, Subcommand};

#[derive(Parser)]
#[command(
    name = "celadon",
    version,
    about = "Workflow service layer on top of Zene"
)]
pub struct Cli {
    #[command(subcommand)]
    pub command: Commands,
}

#[derive(Subcommand)]
pub enum Commands {
    Start {
        #[arg(long)]
        idea: String,
        #[arg(long)]
        name: Option<String>,
    },
    Idea {
        #[arg(long)]
        session_id: String,
        text: String,
    },
    Prd {
        #[command(subcommand)]
        command: PrdCommand,
    },
    Dev {
        #[command(subcommand)]
        command: DevCommand,
    },
    Deploy {
        #[arg(long)]
        session_id: String,
        #[arg(long, default_value = "staging")]
        env: String,
    },
    Status {
        #[arg(long)]
        session_id: String,
    },
    Serve {
        #[arg(long, default_value_t = 3000)]
        port: u16,
    },
}

#[derive(Subcommand)]
pub enum PrdCommand {
    Generate {
        #[arg(long)]
        session_id: String,
    },
}

#[derive(Subcommand)]
pub enum DevCommand {
    Run {
        #[arg(long)]
        session_id: String,
        #[arg(long)]
        instruction: Option<String>,
        #[arg(long, default_value_t = false)]
        dry_run: bool,
    },
}

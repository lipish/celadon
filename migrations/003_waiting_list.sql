-- Create waiting_list table
CREATE TABLE IF NOT EXISTS waiting_list (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL,
    idea TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_waiting_list_email ON waiting_list(email);

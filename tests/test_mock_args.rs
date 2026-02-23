fn main() {
    let args_str = "{}";
    let args: serde_json::Value = serde_json::from_str(&args_str).unwrap_or(serde_json::Value::Null);
    println!("args: {:?}", args);
    let pattern = args.get("pattern").and_then(|v| v.as_str());
    println!("pattern: {:?}", pattern);
}

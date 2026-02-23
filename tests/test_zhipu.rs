use std::time::Duration;

#[tokio::main]
async fn main() {
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(10))
        .build()
        .unwrap();
    
    let res = client.post("https://open.bigmodel.cn/api/paas/v4/chat/completions")
        .header("Authorization", "Bearer invalid")
        .send()
        .await;
        
    println!("{:?}", res);
}

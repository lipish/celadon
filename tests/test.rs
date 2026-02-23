use tokio::sync::Mutex;
use std::sync::Arc;

async fn my_lib_fn(m: Arc<Mutex<i32>>) {
    // This library function naively calls blocking_lock
    let _g = m.blocking_lock();
    println!("Got blocking lock!");
}

fn main() {
    let m = Arc::new(Mutex::new(0));
    let rt = tokio::runtime::Builder::new_multi_thread().enable_all().build().unwrap();
    let _guard = rt.enter();
    futures::executor::block_on(async {
        // Use reqwest to prove we have Tokio reactor
        let _ = reqwest::get("http://example.com").await;
        my_lib_fn(m).await;
    });
}

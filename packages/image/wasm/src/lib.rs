extern crate cfg_if;
extern crate wasm_bindgen;

mod utils;

use std::mem;
use std::slice;
use std::os::raw::c_void;
use wasm_bindgen::prelude::*;

fn clip255(v: f64) -> u8 {
  return v.round() as u8
}

extern {
    fn print(n: i32);
}

// Adapted from https://www.hellorust.com/demos/canvas/index.html
#[wasm_bindgen]
pub extern "C" fn alloc(size: usize) -> *mut c_void {
    let mut buf = Vec::with_capacity(size);
    let ptr = buf.as_mut_ptr();
    mem::forget(buf);
    return ptr as *mut c_void;
}

#[wasm_bindgen]
pub extern "C" fn dealloc(ptr: *mut c_void, cap: usize) {
    unsafe {
        let _buf = Vec::from_raw_parts(ptr, 0, cap);
    }
}

#[wasm_bindgen]
pub fn toYCbCr(pointer: *mut u8, num_pixels: usize) {
  let bytesize = num_pixels * 3;
  let data = unsafe { slice::from_raw_parts_mut(pointer, bytesize) };

  for i in 0..num_pixels {
    let offset = i * 3;
    let r = data[offset];
    let g = data[offset + 1];
    let b = data[offset + 2];

    data[offset + 0] = clip255(0.0 + 0.299 * (r as f64) + 0.587 * (g as f64) + 0.114 * (b as f64));
    data[offset + 1] = clip255(128.0 - 0.169 * (r as f64) - 0.331 * (g as f64) + 0.501 * (b as f64));
    data[offset + 2] = clip255(128.0 + 0.501 * (r as f64) - 0.419 * (g as f64) - 0.081 * (b as f64));
  }
}

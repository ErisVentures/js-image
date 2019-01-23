extern crate cfg_if;
extern crate wasm_bindgen;

mod utils;

use std::mem;
use std::slice;
use std::os::raw::c_void;
use wasm_bindgen::prelude::*;

fn clip255(v: f32) -> u8 {
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

    data[offset + 0] = clip255(0.0 + 0.299 * (r as f32) + 0.587 * (g as f32) + 0.114 * (b as f32));
    data[offset + 1] = clip255(128.0 - 0.169 * (r as f32) - 0.331 * (g as f32) + 0.501 * (b as f32));
    data[offset + 2] = clip255(128.0 + 0.501 * (r as f32) - 0.419 * (g as f32) - 0.081 * (b as f32));
  }
}

// While this isn't 100% accurate, it's much, MUCH faster
// See https://www.desmos.com/calculator/scyl4fhjns
// Essentially...
//    v <= 0.2 ... y = x * x
//    v <= 0.6 ... y = x * x - 0.125 * x + .025
//    v <= 1.0 ... y = x * x + 0.125 * x - .125
fn gammaCorrectForward(v: f32) -> f32 {
  if (v <= 0.2) { return v * v; }
  if (v <= 0.6) { return v * v - 0.125 * v + 0.025; }
  return v * v + 0.125 * v - 0.125;
}

// Pluggin in our choke points to reverse the previous functions...
//    y <= 0.04 ... y = x * x
//    v <= 0.31 ... y = x * x - 0.125 * x + .025
//    v <= 1.00 ... y = x * x + 0.125 * x - .125
fn gammaCorrectReverse(v: f32) -> f32 {
  if (v <= 0.04) { return v.sqrt(); }
  if (v <= 0.31) { return ((6400.0 * v - 135.0).sqrt() + 5.0) / 80.0; }
  return ((256.0 * v + 33.0).sqrt() - 1.0) / 16.0;
}

#[wasm_bindgen]
pub fn toXYZ(
  pointer: *mut f32,
  num_pixels: usize,
  x_red: f32,
  x_green: f32,
  x_blue: f32,
  y_red: f32,
  y_green: f32,
  y_blue: f32,
  z_red: f32,
  z_green: f32,
  z_blue: f32
) {
  let bytesize = num_pixels * 3 * 4;
  let data = unsafe { slice::from_raw_parts_mut(pointer, bytesize) };

  for i in 0..num_pixels {
    let offset = i * 3;
    let r_linear = gammaCorrectForward(data[offset] / 255_f32);
    let g_linear = gammaCorrectForward(data[offset + 1] / 255_f32);
    let b_linear = gammaCorrectForward(data[offset + 2] / 255_f32);

    data[offset + 0] = x_red * r_linear + x_green * g_linear + x_blue * b_linear;
    data[offset + 1] = y_red * r_linear + y_green * g_linear + y_blue * b_linear;
    data[offset + 2] = z_red * r_linear + z_green * g_linear + z_blue * b_linear;
  }
}

#[wasm_bindgen]
pub fn toRGBFromXYZ(
  pointer_in: *mut f32,
  pointer_out: *mut u8,
  num_pixels: usize
) {
  let data_in = unsafe { slice::from_raw_parts_mut(pointer_in, num_pixels * 3 * 4) };
  let data_out = unsafe { slice::from_raw_parts_mut(pointer_out, num_pixels * 3) };

  for i in 0..num_pixels {
    let offset = i * 3;
    let x = data_in[offset + 0];
    let y = data_in[offset + 1];
    let z = data_in[offset + 2];
    let r_linear = 3.2406 * x - 1.5372 * y - 0.4986 * z;
    let g_linear = -0.9689 * x + 1.8758 * y + 0.0415 * z;
    let b_linear = 0.0557 * x - 0.204 * y + 1.057 * z;

    data_out[offset + 0] = clip255(gammaCorrectReverse(r_linear) * 255_f32);
    data_out[offset + 1] = clip255(gammaCorrectReverse(g_linear) * 255_f32);
    data_out[offset + 2] = clip255(gammaCorrectReverse(b_linear) * 255_f32);
  }
}

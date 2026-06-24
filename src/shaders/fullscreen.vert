#version 300 es
// Fullscreen triangle vertex shader.
// Draws a single oversized triangle that covers the whole clip-space quad.
// No vertex buffer needed — positions are derived from gl_VertexID.
//
// Call with: gl.drawArrays(gl.TRIANGLES, 0, 3)

out vec2 v_uv;

void main() {
  // gl_VertexID -> 0,1,2
  // Produces clip-space coords (-1,-1), (3,-1), (-1,3) which form a
  // triangle large enough to cover the [-1,1] viewport.
  vec2 p = vec2(
    float((gl_VertexID << 1) & 2),
    float(gl_VertexID & 2)
  );
  v_uv = p;                 // 0..2 range, gives 0..1 across the visible quad
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}

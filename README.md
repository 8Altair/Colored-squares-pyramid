# Colored Squares Pyramid WebGL Demo

This repository contains a small **WebGL 2.0** application built with HTML, JavaScript, and GLSL.  
It demonstrates how to set up a WebGL rendering context, compile and link shaders, build a simple geometry buffer,  
and draw multiple colored squares that form a pyramid sitting on a ground plane.  

The project was created to show the usage of **WebGL** for interactive 2-D graphics in the browser  
and to illustrate how to combine the **gl-matrix** library with WebGL to manage transformation matrices.

---

## Project Structure

| File | Purpose |
|------|----------|
| `index.html` | Defines the HTML5 document, includes external libraries (gl-matrix and jQuery), embeds the vertex and fragment shader source in `<script>` tags, declares the canvas where WebGL draws, and provides radio buttons to switch between automatic and manual color animation. |
| `gldemo.js` | Contains all of the JavaScript logic to initialize WebGL, compile and link the shaders, build the square geometry, set up matrices and transformation parameters, animate the square colors, handle user input, and implement the render loop. |

The shaders live in the `<script>` tags inside **index.html**:

- **Vertex shader** – takes a 3-component position from the VBO, multiplies it by a uniform Model-View-Projection (MVP) matrix, and writes the result to `gl_Position`.  
  The matrix is built in JavaScript using gl-matrix and combines model transforms for each square with a view and orthographic projection.
- **Fragment shader** – reads a uniform `vec4` color and writes it directly to the fragment output, producing a flat, solid color for each square.

---

## How It Works

### 1. Initialization (`gldemo.js`)

- Grabs the `#glCanvas` element and requests a WebGL 2 context.  
  If the browser does not support WebGL 2, the script alerts the user and stops execution.
- Reads the vertex and fragment shader source from the HTML, compiles them with `compile()`, links them into a program with `createProgram()`,  
  and queries the locations of the `position` attribute and `mvp` and `color` uniforms.
- Defines a unit square in the X-Z plane as two triangles and uploads it to a vertex buffer.  
  A VAO records how the attribute is laid out (three floats per vertex).
- Sets up an orthographic projection matrix sized to the canvas and an identity view matrix.  
  Model matrices are built per square.
- Defines constants that control the pyramid layout:  
  `halfHeight`, `groundHeight`, `groundWidth`, `squareSize`, `groundGap`, and `interRowGap`.  
  Then computes Y positions for each row (`baseY`, `secondY`, `thirdY`, `topY`) and X positions for each square in each row.
- Stores an RGBA color for the ground and one for each of the ten squares.  
  A parallel array `colorSpeedAndDirection` holds small random velocity vectors used to animate RGB channels over time.

---

### 2. User Interaction

- Two radio buttons allow switching between **Automatic** and **Manual** color modes.  
  - In *automatic* mode, all squares gradually change color every `COLOR_UPDATE_INTERVAL` seconds (0.5 s by default).  
  - In *manual* mode, pressing number keys 1–9 or 0 changes the color of a single square from left to right:
    - Keys **1–4** → base row  
    - Keys **5–7** → second row  
    - Keys **8–9** → third row  
    - Key **0** → top square

---

### 3. Rendering

- The `render()` function runs continuously via `requestAnimationFrame()`.
- Each frame:
  1. Clears the canvas and updates colors if in automatic mode.  
  2. Draws the ground and each square:
     - Builds a model matrix with translation and rotation so each square faces the viewer.
     - For the ground, scales the square to form a long, thin strip.
     - Computes `mvp = projection × view × model` and uploads it to the shader.
     - Sends the square’s color to the fragment shader and draws it with `gl.drawArrays(gl.TRIANGLES, 0, 6)`.  
       The same geometry is reused for all squares; only the uniform values change.

---

### 4. Responsiveness

The canvas automatically resizes to maintain a 5 : 3 aspect ratio and avoid scrollbars.  
When the window size changes, the orthographic projection is recalculated to preserve proportions.

---

## Usage

1. **Clone or download** this repository.  
2. **Open `index.html`** in a modern browser that supports WebGL 2.  
3. You’ll see a pyramid of colored squares resting on a gray strip (the ground).  

**Controls:**
- **Automatic Color:** Squares slowly change colors over time.  
- **Manual Color:** Press number keys to assign new random colors.

---

## Dependencies

- **WebGL 2.0** – provides the graphics context and shader pipeline.  
- **[gl-matrix](https://github.com/toji/gl-matrix)** – used for 4×4 matrix creation and multiplication.  
- **[jQuery](https://jquery.com/)** – simplifies DOM event handling for UI controls and keyboard input.

These dependencies are loaded from public CDNs in `index.html` and require no installation.

---

## Purpose and Learning Points

This project is a **minimal yet complete example** of using **IWebGL / WebGL 2.0** to draw 2-D geometry with 3-D transformations.  
It demonstrates:

- Creating and using shaders and program objects.  
- Uploading geometry to vertex buffers and configuring vertex attributes with VAOs.  
- Building orthographic projections and model transforms using gl-matrix.  
- Drawing multiple instances by updating uniform values between draw calls.  
- Implementing basic animation and user interaction in JavaScript.

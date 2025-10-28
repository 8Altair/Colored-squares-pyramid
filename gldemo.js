/* global glMatrix, $ */

(function ()
{
    "use strict";   // Strict mode

    // DOM
    const canvas = document.getElementById("glCanvas"); // Fetch defined canvas by ID

    // Responsive sizing: fit canvas into viewport under the controls, keep 5:3 aspect, avoid scrolling
    const ASPECT = 5 / 3;   // width / height
    function resizeCanvasAndProjection()
    {
        const pad = 20; // Override padding
        const availableWidth = Math.max(200, window.innerWidth - pad);  // max(fixed width, window width - padding)
        const availableHeight = Math.max(200, window.innerHeight - 60); // max(fixed height, window height - 60)
        let width = availableWidth, height = Math.floor(width / ASPECT);    // width * a_height / a_width
        if (height > availableHeight)   // Repeat for width if oversized
        {
            height = availableHeight;
            width = Math.floor(height * ASPECT);
        }
        canvas.width = width;   // Canvas width
        canvas.height = height;   // Canvas height

        // Update projection with the new aspect
        const aspect = width / height;
        const halfHeight = parameters.halfHeight;
        const halfWidth = aspect * halfHeight;
        glMatrix.mat4.ortho(state.projection, -halfWidth, halfWidth, -halfHeight, halfHeight, -1.0, 1.0);   // 2D
    }

      // WebGL
      /** @type {WebGL2RenderingContext} */
      const gl = canvas.getContext("webgl2");   // Requests a WebGL 2.0 rendering context from the HTML <canvas> element
      if (!gl)
      {
          alert("WebGL2 not supported on this browser.");
          return;
      }

      function compile(type, source)
      {
          // type → which kind of shader to build (gl.VERTEX_SHADER or gl.FRAGMENT_SHADER)
          // source → the GLSL code as a JavaScript string (<script id="vs"> or <script id="fs"> contents)
          const shader = gl.createShader(type);  // Create an empty shader object on the GPU
          gl.shaderSource(shader, source); // Uploads GLSL source code string from JS into shader object
          gl.compileShader(shader); // Turns human-readable shader code into GPU-executable instructions

          if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
          {
              const log = gl.getShaderInfoLog(shader) || "";
              console.error("Shader compile error:", log, "\nSource:\n", source);
              gl.deleteShader(shader);
              throw new Error("Shader compile failed");
          }

          return shader;
      }

      // Builds the complete GPU shader program
      function createProgram(vertexShaderSource, fragmentShaderSource)
      {
          const vertexShader = compile(gl.VERTEX_SHADER, vertexShaderSource);
          const fragmentShader = compile(gl.FRAGMENT_SHADER, fragmentShaderSource);
          const shaderProgram = gl.createProgram();

          // Attach the compiled shaders to the program object
          gl.attachShader(shaderProgram, vertexShader);
          gl.attachShader(shaderProgram, fragmentShader);

          gl.linkProgram(shaderProgram);    // Links the vertex and fragment shaders together into a single executable GPU pipeline
          gl.deleteShader(vertexShader);
          gl.deleteShader(fragmentShader);

          if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS))
          {
              const log = gl.getProgramInfoLog(shaderProgram) || "";
              console.error("Program link error:", log);
              throw new Error("Program link failed");
          }

          return shaderProgram;
      }

      const vertexShaderSource = document.getElementById("vs").textContent.trim();  // Read vs
      const fragmentShaderSource = document.getElementById("fs").textContent.trim();    // Read fs
      const program = createProgram(vertexShaderSource, fragmentShaderSource);
      gl.useProgram(program);

      const location =  // Shader variables from shader definitions
          {
              position: gl.getAttribLocation(program, "position"),
              mvp: gl.getUniformLocation(program, "mvp"),
              color: gl.getUniformLocation(program, "color"),
          };

      // Geometry (unit square in XZ plane)
      const vertices = new Float32Array(
          [
                    // Triangle 1 (first half of the square)
                    -0.5, 0.0, -0.5, // Bottom-left vertex
                     0.5, 0.0, -0.5, // Bottom-right vertex
                     0.5, 0.0,  0.5, // Top-right vertex
                    // Triangle 2 (second half of the square)
                    -0.5, 0.0, -0.5, // Bottom-left vertex (reused)
                     0.5, 0.0,  0.5, // Top-right vertex (reused)
                    -0.5, 0.0,  0.5  // top-left vertex
                  ]);

      const vertexArrayObject = gl.createVertexArray();
      gl.bindVertexArray(vertexArrayObject);
      const vertexBufferObject = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, vertexBufferObject);
      gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
      gl.enableVertexAttribArray(location.position);
      gl.vertexAttribPointer(location.position, 3, gl.FLOAT, false, 0, 0);  // Each vertex is made of 3 float values (x, y, z), packed tightly, starting at byte 0
      gl.bindVertexArray(null);
      gl.bindBuffer(gl.ARRAY_BUFFER, null);

      // Matrices
      const state =
          {
              projection: glMatrix.mat4.create(),
              view: glMatrix.mat4.create(), // Identity
          };

      const parameters =
          {
              halfHeight: 3.0,
              groundHeight: 0.35,
              groundWidth: 8.0,
              squareSize: 1.0,
              groundGap: 0.32,
              interRowGap: 0.0,
          };

      // Compute fixed Y positions (match original layout)
      function computeY()
      {
          const groundTopY = -parameters.halfHeight + parameters.groundHeight;
          const baseY = groundTopY + parameters.squareSize * 0.5 + parameters.groundGap;
          const secondY = baseY + parameters.squareSize + parameters.interRowGap;
          const thirdY = secondY + parameters.squareSize + parameters.interRowGap;
          const topY = thirdY + parameters.squareSize + parameters.interRowGap;
          return { baseY, secondY, thirdY, topY };
      }

      const rows =
          {
              baseXs: [-1.5, -0.5, 0.5, 1.5],
              secondXs: [-1.0,  0.0, 1.0],
              thirdXs: [-0.5, 0.5],
              topXs: [0.0]
          };

      // Colors and animation
      const groundColor = new Float32Array([0.55, 0.55, 0.55, 1.0]);    // Gray floor
      const squareColors =
          [
              new Float32Array([1.0, 0.2, 0.2, 1.0]),
              new Float32Array([0.2, 1.0, 0.2, 1.0]),
              new Float32Array([0.2, 0.6, 1.0, 1.0]),
              new Float32Array([1.0, 0.6, 0.2, 1.0]),

              new Float32Array([0.90, 0.10, 0.90, 1.0]),
              new Float32Array([1.00, 1.00, 0.30, 1.0]),
              new Float32Array([0.10, 0.90, 0.90, 1.0]),

              new Float32Array([0.95, 0.50, 0.20, 1.0]),
              new Float32Array([0.30, 0.80, 0.40, 1.0]),

              new Float32Array([0.9, 0.3, 0.4, 1.0]),
          ];

      const colorSpeedAndDirection = squareColors.map(() =>
        new Float32Array(
            [
                        Math.random() * 0.02 - 0.01,
                        Math.random() * 0.02 - 0.01,
                        Math.random() * 0.02 - 0.01,
                     ]));
      let autoMode = true;

      // Timing control for color animation
      const COLOR_UPDATE_INTERVAL = 0.5;   // Seconds between updates
      let lastColorUpdate = 0;

      // UI handlers
      $("input[name='mode']").on("change", function ()
      {
        autoMode = this.value === "auto";
      });

      $(document).on("keydown", function (e)
      {
          if (!autoMode)
          {
              const key = e.key;
              let idx = null;

              if (key >= "1" && key <= "9")
              {
                idx = parseInt(key, 10) - 1;     // 1..9 -> 0..8 (left-to-right across rows)
              }
              else if (key === "0")
              {
                idx = 9;
              }

              if (idx !== null)
              {
                  squareColors[idx][0] = Math.random();
                  squareColors[idx][1] = Math.random();
                  squareColors[idx][2] = Math.random();
              }
          }
     });

      // Draw helpers
      function setMVP(model)
      {
          // Mvp = projection * view * model
          const pv = glMatrix.mat4.create();
          glMatrix.mat4.multiply(pv, state.view, model);
          const mvp = glMatrix.mat4.create();
          glMatrix.mat4.multiply(mvp, state.projection, pv);
          gl.uniformMatrix4fv(location.mvp, false, mvp);
      }

      function drawSquare(model, rgba)
      {
          setMVP(model);
          gl.uniform4fv(location.color, rgba);
          gl.drawArrays(gl.TRIANGLES, 0, 6);
      }

      // Render loop
      function render(timeMs)
      {
          const timeSec = timeMs * 0.001;
          // Update colors if auto and enough time passed
          if (autoMode && timeSec - lastColorUpdate >= COLOR_UPDATE_INTERVAL)
          {
              lastColorUpdate = timeSec;
              for (let i = 0; i < squareColors.length; i++)
              {
                  for (let c = 0; c < 3; c++)
                  {
                      let v = squareColors[i][c] + colorSpeedAndDirection[i][c];
                      if (v < 0.0) { v = 0.0; colorSpeedAndDirection[i][c] *= -1; }
                      if (v > 1.0) { v = 1.0; colorSpeedAndDirection[i][c] *= -1; }
                      squareColors[i][c] = v;
                  }
              }
          }

        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.disable(gl.DEPTH_TEST);
        gl.clearColor(0.10, 0.10, 0.12, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT);

        gl.useProgram(program);
        gl.bindVertexArray(vertexArrayObject);

        const { baseY, secondY, thirdY, topY } = computeY();

        // Ground
        let model = glMatrix.mat4.create();
        glMatrix.mat4.translate(model, model, new Float32Array([0.0, -parameters.halfHeight +
        parameters.groundHeight * 0.5, 0.0]));
        glMatrix.mat4.rotate(model, model, -Math.PI / 2, new Float32Array([1, 0, 0]));
        glMatrix.mat4.scale(model, model, new Float32Array([parameters.groundWidth, parameters.groundHeight, 1.0]));
        drawSquare(model, groundColor);

        // Base row (4)
        model = glMatrix.mat4.create();
        glMatrix.mat4.translate(model, model, new Float32Array([rows.baseXs[0], baseY, 0.0]));
        glMatrix.mat4.rotate(model, model, -Math.PI / 2, new Float32Array([1, 0, 0]));
        drawSquare(model, squareColors[0]);

        model = glMatrix.mat4.create();
        glMatrix.mat4.translate(model, model, new Float32Array([rows.baseXs[1], baseY, 0.0]));
        glMatrix.mat4.rotate(model, model, -Math.PI / 2, new Float32Array([1, 0, 0]));
        drawSquare(model, squareColors[1]);

        model = glMatrix.mat4.create();
        glMatrix.mat4.translate(model, model, new Float32Array([rows.baseXs[2], baseY, 0.0]));
        glMatrix.mat4.rotate(model, model, -Math.PI / 2, new Float32Array([1, 0, 0]));
        drawSquare(model, squareColors[2]);

        model = glMatrix.mat4.create();
        glMatrix.mat4.translate(model, model, new Float32Array([rows.baseXs[3], baseY, 0.0]));
        glMatrix.mat4.rotate(model, model, -Math.PI / 2, new Float32Array([1, 0, 0]));
        drawSquare(model, squareColors[3]);

        // Second row (3)
        model = glMatrix.mat4.create();
        glMatrix.mat4.translate(model, model, new Float32Array([rows.secondXs[0], secondY, 0.0]));
        glMatrix.mat4.rotate(model, model, -Math.PI / 2, new Float32Array([1, 0, 0]));
        drawSquare(model, squareColors[4]);

        model = glMatrix.mat4.create();
        glMatrix.mat4.translate(model, model, new Float32Array([rows.secondXs[1], secondY, 0.0]));
        glMatrix.mat4.rotate(model, model, -Math.PI / 2, new Float32Array([1, 0, 0]));
        drawSquare(model, squareColors[5]);

        model = glMatrix.mat4.create();
        glMatrix.mat4.translate(model, model, new Float32Array([rows.secondXs[2], secondY, 0.0]));
        glMatrix.mat4.rotate(model, model, -Math.PI / 2, new Float32Array([1, 0, 0]));
        drawSquare(model, squareColors[6]);

        // Third row (2)
        model = glMatrix.mat4.create();
        glMatrix.mat4.translate(model, model, new Float32Array([rows.thirdXs[0], thirdY, 0.0]));
        glMatrix.mat4.rotate(model, model, -Math.PI / 2, new Float32Array([1, 0, 0]));
        drawSquare(model, squareColors[7]);

        model = glMatrix.mat4.create();
        glMatrix.mat4.translate(model, model, new Float32Array([rows.thirdXs[1], thirdY, 0.0]));
        glMatrix.mat4.rotate(model, model, -Math.PI / 2, new Float32Array([1, 0, 0]));
        drawSquare(model, squareColors[8]);

        // Top row (1)
        model = glMatrix.mat4.create();
        glMatrix.mat4.translate(model, model, new Float32Array([rows.topXs[0], topY, 0.0]));
        glMatrix.mat4.rotate(model, model, -Math.PI / 2, new Float32Array([1, 0, 0]));
        drawSquare(model, squareColors[9]);

        gl.bindVertexArray(null);
        gl.useProgram(null);

        requestAnimationFrame(render);
      }

      resizeCanvasAndProjection();
      window.addEventListener("resize", resizeCanvasAndProjection);

      render();
})();

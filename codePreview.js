// --- Code Preview Functionality ---

/**
 * Opens a new window and attempts to render/execute the provided code.
 * @param {string} code - The code string to preview.
 * @param {string} language - The language of the code ('html', 'javascript', 'css').
 */
export function previewCode(code, language) {
    if (!code || !language) {
        console.error("Preview function requires code and language.");
        alert("Cannot preview: Missing code or language information.");
        return;
    }

    try {
        const previewWindow = window.open('', '_blank', 'width=800,height=600,resizable=yes,scrollbars=yes');
        if (!previewWindow) {
            alert("Failed to open preview window. Please allow pop-ups for this site.");
            return;
        }

        previewWindow.document.open();
        previewWindow.document.write('<!DOCTYPE html><html><head><title>Code Preview</title>');

        switch (language) {
            case 'html':
                // Directly write the HTML code. The browser will parse it.
                previewWindow.document.write('</head><body>');
                previewWindow.document.write(code);
                previewWindow.document.write('</body></html>');
                break;

            case 'javascript':
                // Embed the JS code within <script> tags in a basic HTML structure.
                previewWindow.document.write(`
                    <style>
                        body { font-family: sans-serif; padding: 15px; background-color: #f0f0f0; }
                        pre { background-color: #fff; padding: 10px; border: 1px solid #ccc; border-radius: 4px; white-space: pre-wrap; word-wrap: break-word; }
                        .log-entry { border-bottom: 1px solid #eee; padding: 5px 0; }
                        .log-entry.error { color: red; font-weight: bold; }
                    </style>
                `);
                previewWindow.document.write('</head><body>');
                previewWindow.document.write('<h1>JavaScript Preview</h1>');
                previewWindow.document.write('<h2>Script Output / Console:</h2>');
                previewWindow.document.write('<div id="output" style="border: 1px solid #ccc; min-height: 100px; padding: 10px; background: white; margin-bottom: 15px;"></div>');
                previewWindow.document.write('<h2>Original Code:</h2>');
                previewWindow.document.write(`<pre><code>${escapeHtml(code)}</code></pre>`);

                // Capture console logs and errors
                previewWindow.document.write(`
                    <script>
                        const outputDiv = document.getElementById('output');
                        const originalConsoleLog = console.log;
                        const originalConsoleError = console.error;
                        const originalConsoleWarn = console.warn;
                        const originalConsoleInfo = console.info;

                        const logToDiv = (type, args) => {
                            const entry = document.createElement('div');
                            entry.classList.add('log-entry');
                            if (type === 'error') entry.classList.add('error');
                            if (type === 'warn') entry.style.color = 'orange';
                            entry.textContent = \`[\${type.toUpperCase()}] \${Array.from(args).map(arg => {
                                try { return JSON.stringify(arg); } catch(e) { return String(arg); }
                            }).join(' ')}\`;
                            outputDiv.appendChild(entry);
                        };

                        console.log = (...args) => { originalConsoleLog.apply(console, args); logToDiv('log', args); };
                        console.error = (...args) => { originalConsoleError.apply(console, args); logToDiv('error', args); };
                        console.warn = (...args) => { originalConsoleWarn.apply(console, args); logToDiv('warn', args); };
                        console.info = (...args) => { originalConsoleInfo.apply(console, args); logToDiv('info', args); };

                        window.onerror = (message, source, lineno, colno, error) => {
                            logToDiv('error', ['Uncaught Error:', message, error ? error.stack : '(no stack)']);
                            return true; // Prevent default browser error handling in preview
                        };
                         window.addEventListener('unhandledrejection', event => {
                             logToDiv('error', ['Unhandled Promise Rejection:', event.reason]);
                         });

                        try {
                            ${code}
                        } catch (e) {
                           logToDiv('error', ['Execution Error:', e.message, e.stack]);
                        }
                    </script>
                `);
                previewWindow.document.write('</body></html>');
                break;

            case 'css':
                // Embed the CSS within <style> tags in a basic HTML structure with sample content.
                previewWindow.document.write(`<style>${code}</style>`);
                previewWindow.document.write('</head><body>');
                previewWindow.document.write(`
                    <h1>CSS Preview</h1>
                    <p>This is some sample text to test the styles.</p>
                    <div class="sample-div" style="border:1px dashed grey; padding: 10px; margin-top:10px;">
                        This is a sample div. Try applying styles to <code>.sample-div</code> or standard elements like <code>h1</code>, <code>p</code>.
                    </div>
                    <button class="sample-button">Sample Button</button>
                    <hr>
                    <h2>Original CSS Code:</h2>
                    <pre><code>${escapeHtml(code)}</code></pre>
                `);
                previewWindow.document.write('</body></html>');
                break;

            default:
                // Should not happen if called correctly, but handle anyway
                previewWindow.document.write('</head><body>');
                previewWindow.document.write(`<h1>Preview Not Supported</h1><p>Preview is not available for language: ${escapeHtml(language)}</p>`);
                previewWindow.document.write(`<pre><code>${escapeHtml(code)}</code></pre>`);
                previewWindow.document.write('</body></html>');
                console.warn(`Preview attempted for unsupported language: ${language}`);
        }

        previewWindow.document.close(); // Finish writing to the document

    } catch (error) {
        console.error("Error creating preview:", error);
        alert(`An error occurred while trying to create the preview: ${error.message}`);
    }
}

// Helper function to escape HTML characters for display in <pre><code>
function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
 }
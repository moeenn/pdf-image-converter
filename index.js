document.addEventListener("DOMContentLoaded", main);
async function main() {
  const options = {
    input_selector: "#pdf_file",
    preview_selector: "#preview",
    worker: "./lib/pdf.worker.js",
    scale: 2.0,
  };

  const input = document.querySelector(options.input_selector);
  const encoded_data = await get_file_content(input);

  pdfjsLib.GlobalWorkerOptions.workerSrc = options.worker;
  process_document(encoded_data, options);
}

async function get_file_content(input_element) {
  const reader = new FileReader();

  return new Promise((resolve, reject) => {
    input_element.onchange = () => {
      const file = input_element.files[0];

      if (!is_pdf(file.name)) {
        reject("Invalid file selected");
        return;
      }

      reader.addEventListener("load", () => {
        const encoding = extract_encoding(reader.result);
        resolve(encoding);
      }, false);

      if (file) {
        reader.readAsDataURL(file);
      }
    };
  });
}

function is_pdf(filename) {
  const pattern = /^[\S]*.(pdf|PDF)$/i;
  return pattern.test(filename);
}

function extract_encoding(full_encoding) {
  const pieces = full_encoding.split(",");

  // remove encoding details
  pieces.shift();

  // return binary representation
  return atob(pieces.join(','));
}

async function process_document(encoded_data, options) {
  const loadingTask = pdfjsLib.getDocument({ data: encoded_data });
  const pdf = await loadingTask.promise;
  const total_pages = pdf.numPages;

  for (let page = 1; page <= total_pages; page++) {
    const img = await handle_load(pdf, options, page);
    display(img.image_encoding);
  }
}

async function handle_load(pdf, options, page_num) {
  // Fetch the first page
  const page = await pdf.getPage(page_num);
  const viewport = page.getViewport({ scale: options.scale });

  // Prepare canvas using PDF page dimensions
  const canvas = document.querySelector(options.preview_selector);
  const context = canvas.getContext('2d');

  canvas.height = viewport.height;
  canvas.width = viewport.width;

  // Render PDF page into canvas context
  const renderContext = {
    canvasContext: context,
    viewport: viewport
  };

  return new Promise((resolve) => {
    const renderTask = page.render(renderContext);
    renderTask.promise.then(
      () => {
        console.log('Page rendered')

        const image_encoding = canvas.toDataURL();
        resolve({ page_num, image_encoding });
      }
    );
  });
}

function display(image) {
  const preview = document.querySelector("#root");
  const markup = `<img src="${image}" height="300px" />`;
  preview.innerHTML += markup;
}
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

/**
 * Converts an HTML element to a high-resolution PDF.
 * @param {HTMLElement} element - The DOM node to convert.
 * @param {string} filename - The desired name of the downloaded file.
 */
export const convertElementToPDF = async (element, filename) => {
  if (!element) return;

  // 1. Force the browser to wait for custom fonts to load
  await document.fonts.ready;

  // 2. Add a tiny delay to ensure the browser has painted the DOM
  return new Promise((resolve) => {
    setTimeout(async () => {
      // 3. Convert the DOM element to a canvas
      const canvas = await html2canvas(element, { 
        scale: 3, // High resolution for print
        useCORS: true,
        allowTaint: false, // avoid tainted canvases (safer and respects CORS)
        scrollY: -window.scrollY // Fixes shifting if the user scrolled down
      });
      
      // 4. Convert the canvas to an image format jsPDF can read
      const imgData = canvas.toDataURL('image/jpeg', 1.0);
      
      // 5. Initialize the PDF document (Portrait, Millimeters, A4 size)
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      // 6. Calculate the exact dimensions to fit the A4 page dynamically
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      // 7. Embed the image and trigger the download
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(filename);
      
      resolve(true);
    }, 300);
  });
};
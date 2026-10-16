package com.opas.service;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.core.SdkBytes;
import software.amazon.awssdk.services.textract.TextractClient;
import software.amazon.awssdk.services.textract.model.Block;
import software.amazon.awssdk.services.textract.model.BlockType;
import software.amazon.awssdk.services.textract.model.DetectDocumentTextRequest;
import software.amazon.awssdk.services.textract.model.DetectDocumentTextResponse;
import software.amazon.awssdk.services.textract.model.Document;

/**
 * Turns an uploaded file's raw bytes into plain text before the AI step. Uploads are
 * images (camera scans) or PDFs — reading their bytes as a UTF-8 string produces
 * garbage, so a real extraction step is required per content type:
 *
 * <ul>
 *   <li>PDF → PDFBox reads the embedded text layer (digital, text-based PDFs).</li>
 *   <li>Image (JPEG/PNG/TIFF) → AWS Textract OCR reads the text off the picture.</li>
 *   <li>text/plain → decoded directly.</li>
 * </ul>
 */
@Service
public class TextExtractionService {

    private static final Logger log = LoggerFactory.getLogger(TextExtractionService.class);

    private final TextractClient textractClient;

    public TextExtractionService(TextractClient textractClient) {
        this.textractClient = textractClient;
    }

    public String extract(String contentType, byte[] bytes) {
        String type = contentType == null ? "" : contentType.toLowerCase();
        try {
            if (type.equals("text/plain")) {
                return new String(bytes, StandardCharsets.UTF_8);
            }
            if (type.equals("application/pdf")) {
                return extractFromPdf(bytes);
            }
            // image/jpeg, image/png, image/tiff, image/heic — hand the bytes to OCR.
            return extractFromImage(bytes);
        } catch (TextExtractionException e) {
            throw e;
        } catch (Exception e) {
            throw new TextExtractionException("Failed to extract text from document (" + type + ")", e);
        }
    }

    private String extractFromPdf(byte[] bytes) throws IOException {
        try (PDDocument document = Loader.loadPDF(bytes)) {
            String text = new PDFTextStripper().getText(document);
            if (text == null || text.isBlank()) {
                // A scanned PDF has no text layer. Synchronous OCR only handles single
                // images, so surface a clear failure rather than sending empty text on.
                throw new TextExtractionException("PDF has no extractable text (likely a scan)", null);
            }
            return text;
        }
    }

    private String extractFromImage(byte[] bytes) {
        DetectDocumentTextResponse response = textractClient.detectDocumentText(
                DetectDocumentTextRequest.builder()
                        .document(Document.builder().bytes(SdkBytes.fromByteArray(bytes)).build())
                        .build());
        StringBuilder sb = new StringBuilder();
        for (Block block : response.blocks()) {
            if (block.blockType() == BlockType.LINE) {
                sb.append(block.text()).append('\n');
            }
        }
        String text = sb.toString();
        if (text.isBlank()) {
            log.warn("Textract returned no text lines for image document");
            throw new TextExtractionException("No text could be read from the image", null);
        }
        return text;
    }
}

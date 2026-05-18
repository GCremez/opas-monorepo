package com.opas.service;

import com.opas.dto.DocumentSearchResult;
import com.pgvector.PGvector;
import jakarta.persistence.EntityManager;
import java.util.List;
import java.util.UUID;
import org.springframework.ai.embedding.EmbeddingModel;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class EmbeddingService {

    private final EmbeddingModel embeddingModel;
    private final EntityManager entityManager;

    public EmbeddingService(EmbeddingModel embeddingModel, EntityManager entityManager) {
        this.embeddingModel = embeddingModel;
        this.entityManager = entityManager;
    }

    @Transactional
    public void storeEmbedding(UUID documentId, String text) {
        float[] vector = embeddingModel.embed(text);
        PGvector pgVector = new PGvector(vector);
        entityManager.createNativeQuery("UPDATE documents SET embedding = ?1::vector WHERE id = ?2")
                .setParameter(1, pgVector).setParameter(2, documentId).executeUpdate();
    }

    @Transactional(readOnly = true)
    public List<UUID> searchSimilar(String query, int limit) {
        float[] vector = embeddingModel.embed(query);
        PGvector pgVector = new PGvector(vector);
        @SuppressWarnings("unchecked")
        List<UUID> ids = entityManager.createNativeQuery(
                "SELECT id FROM documents WHERE embedding IS NOT NULL ORDER BY embedding <=> ?1::vector LIMIT ?2")
                .setParameter(1, pgVector).setParameter(2, limit).getResultList();
        return ids;
    }

    @Transactional(readOnly = true)
    public List<DocumentSearchResult> searchSimilarWithScore(String query, int limit) {
        float[] vector = embeddingModel.embed(query);
        PGvector pgVector = new PGvector(vector);
        @SuppressWarnings("unchecked")
        List<Object[]> rows = entityManager
                .createNativeQuery("SELECT id, filename, 1 - (embedding <=> ?1::vector) AS similarity "
                        + "FROM documents WHERE embedding IS NOT NULL " + "ORDER BY embedding <=> ?1::vector LIMIT ?2")
                .setParameter(1, pgVector).setParameter(2, limit).getResultList();
        return rows.stream().filter(row -> row[0] != null).map(row -> new DocumentSearchResult((UUID) row[0],
                row[1] != null ? (String) row[1] : null, row[2] != null ? ((Number) row[2]).doubleValue() : 0.0))
                .toList();
    }
}

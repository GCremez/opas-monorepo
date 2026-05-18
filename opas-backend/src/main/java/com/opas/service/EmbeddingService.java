package com.opas.service;

import com.opas.dto.DocumentSearchResult;
import com.pgvector.PGvector;
import org.springframework.ai.embedding.EmbeddingModel;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import java.util.List;
import java.util.UUID;

@Service
public class EmbeddingService {

    private final EmbeddingModel embeddingModel;

    @PersistenceContext
    private EntityManager entityManager;

    public EmbeddingService(EmbeddingModel embeddingModel) {
        this.embeddingModel = embeddingModel;
    }

    @Transactional
    public void storeEmbedding(UUID documentId, String text) {
        float[] vector = embeddingModel.embed(text);
        PGvector pgVector = new PGvector(vector);
        entityManager.createNativeQuery(
                "UPDATE documents SET embedding = ?1::vector WHERE id = ?2")
                .setParameter(1, pgVector)
                .setParameter(2, documentId)
                .executeUpdate();
    }

    @Transactional(readOnly = true)
    public List<UUID> searchSimilar(String query, int limit) {
        float[] vector = embeddingModel.embed(query);
        PGvector pgVector = new PGvector(vector);
        @SuppressWarnings("unchecked")
        List<UUID> ids = entityManager.createNativeQuery(
                        "SELECT id FROM documents WHERE embedding IS NOT NULL ORDER BY embedding <=> ?1::vector LIMIT ?2")
                .setParameter(1, pgVector)
                .setParameter(2, limit)
                .getResultList();
        return ids;
    }

    @Transactional(readOnly = true)
    public List<DocumentSearchResult> searchSimilarWithScore(String query, int limit) {
        float[] vector = embeddingModel.embed(query);
        PGvector pgVector = new PGvector(vector);
        @SuppressWarnings("unchecked")
        List<Object[]> rows = entityManager.createNativeQuery(
                        "SELECT id, filename, 1 - (embedding <=> ?1::vector) AS similarity " +
                                "FROM documents WHERE embedding IS NOT NULL " +
                                "ORDER BY embedding <=> ?1::vector LIMIT ?2")
                .setParameter(1, pgVector)
                .setParameter(2, limit)
                .getResultList();
        return rows.stream()
                .map(row -> new DocumentSearchResult(
                        (UUID) row[0], (String) row[1], ((Number) row[2]).doubleValue()))
                .toList();
    }
}

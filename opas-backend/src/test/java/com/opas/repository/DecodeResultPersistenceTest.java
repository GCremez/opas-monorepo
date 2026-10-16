package com.opas.repository;

import static org.junit.jupiter.api.Assertions.*;

import com.opas.domain.DecodeResult;
import com.opas.domain.Document;
import com.opas.domain.User;
import java.time.Instant;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

/**
 * Saves decode results through Hibernate against real Postgres (with the Flyway schema),
 * which mocks can't cover: the jsonb/text column bindings only fail at the database.
 */
@DataJpaTest
@Testcontainers
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class DecodeResultPersistenceTest {

    @Container
    @SuppressWarnings("resource")
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("pgvector/pgvector:pg16");

    @DynamicPropertySource
    static void datasource(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    @Autowired
    private TestEntityManager em;
    @Autowired
    private DecodeResultRepository decodeResultRepository;
    @Autowired
    private JdbcTemplate jdbc;

    @Test
    void savesProseRawResponseAndJsonStructuredData() {
        User user = new User();
        user.setEmail("persist@example.com");
        user.setPasswordHash("x");
        user.setName("Persist");
        user.setLanguage("en");
        em.persist(user);
        Document document = new Document();
        document.setUser(user);
        document.setFilename("kela.jpg");
        document.setS3Key("k");
        document.setStatus("ready");
        em.persist(document);

        DecodeResult result = new DecodeResult();
        result.setDocument(document);
        result.setUser(user);
        result.setRawResponse("Here is the analysis you asked for: {\"title\": \"Approved\"}");
        result.setStructuredData("{\"title\": \"Approved\", \"deadlines\": []}");
        result.setModel("test");
        result.setStartedAt(Instant.now());
        result.setCompletedAt(Instant.now());
        decodeResultRepository.save(result);
        em.flush();
        em.clear();

        var loaded = decodeResultRepository.findByUserIdOrderByCreatedAtDesc(user.getId());
        assertEquals(1, loaded.size());
        assertTrue(loaded.getFirst().getRawResponse().startsWith("Here is the analysis"));
        // Stored as real jsonb, queryable as JSON.
        assertEquals("Approved", jdbc.queryForObject(
                "SELECT structured_data->>'title' FROM decode_results WHERE id = ?", String.class,
                loaded.getFirst().getId()));
    }
}

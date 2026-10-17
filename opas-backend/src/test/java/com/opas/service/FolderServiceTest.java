package com.opas.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

import com.opas.domain.DocumentCategory;
import com.opas.domain.Folder;
import com.opas.domain.User;
import com.opas.dto.FolderRequest;
import com.opas.repository.DocumentRepository;
import com.opas.repository.FolderRepository;
import com.opas.repository.UserRepository;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class FolderServiceTest {

    private final FolderRepository folders = mock(FolderRepository.class);
    private final UserRepository users = mock(UserRepository.class);
    private final DocumentRepository documents = mock(DocumentRepository.class);
    private final FolderService service = new FolderService(folders, users, documents);
    private final UUID userId = UUID.randomUUID();
    private User user;

    @BeforeEach
    void setUp() {
        user = new User();
        user.setId(userId);
        when(users.getReferenceById(userId)).thenReturn(user);
    }

    private Folder folder(String name, String categoryKey) {
        Folder f = new Folder();
        f.setId(UUID.randomUUID());
        f.setUser(user);
        f.setName(name);
        f.setCategoryKey(categoryKey);
        f.setCreatedAt(Instant.now());
        f.setUpdatedAt(Instant.now());
        return f;
    }

    @Test
    void listCreatesMissingBuiltInsAndPutsThemFirstInOrder() {
        List<Folder> stored = new ArrayList<>();
        stored.add(folder("My insurance", null));
        stored.add(folder("Kela & benefits", "kela"));
        when(folders.findByUserIdAndCategoryKey(eq(userId), anyString())).thenAnswer(inv ->
                stored.stream().filter(f -> inv.getArgument(1).equals(f.getCategoryKey())).findFirst());
        when(folders.save(any(Folder.class))).thenAnswer(inv -> {
            Folder f = inv.getArgument(0);
            f.setId(UUID.randomUUID());
            stored.add(f);
            return f;
        });
        when(folders.findByUserIdOrderByCreatedAtDesc(userId)).thenAnswer(inv -> List.copyOf(stored));

        var result = service.list(userId);

        // 7 missing built-ins created (kela already existed), none duplicated.
        verify(folders, times(DocumentCategory.values().length - 1)).save(any(Folder.class));
        assertEquals(DocumentCategory.values().length + 1, result.size());
        assertEquals("tax", result.get(0).categoryKey());
        assertEquals("kela", result.get(2).categoryKey());
        assertNull(result.get(result.size() - 1).categoryKey()); // custom folder last
    }

    @Test
    void builtInFolderIsReusedNotRecreated() {
        Folder kela = folder("Kela & benefits", "kela");
        when(folders.findByUserIdAndCategoryKey(userId, "kela")).thenReturn(Optional.of(kela));

        assertSame(kela, service.builtInFolder(userId, DocumentCategory.KELA));
        verify(folders, never()).save(any());
    }

    @Test
    void builtInFoldersCannotBeDeletedOrRenamed() {
        Folder tax = folder("Tax", "tax");
        when(folders.findById(tax.getId())).thenReturn(Optional.of(tax));

        assertThrows(IllegalArgumentException.class, () -> service.delete(userId, tax.getId()));
        assertThrows(IllegalArgumentException.class,
                () -> service.update(userId, tax.getId(), new FolderRequest("Taxes", null)));
        verify(folders, never()).delete(any());
        verify(documents, never()).clearFolder(any());
    }
}

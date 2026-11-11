# Ubuntu-based Temurin images (glibc), published for x86-64 and ARM64: the local
# embedding model (ONNX Runtime) ships glibc binaries, which Alpine (musl) can't load.
# The jar is the same on every CPU, so the build stage runs natively on the build machine
# (no emulation when building the ARM64 image elsewhere).
FROM --platform=$BUILDPLATFORM eclipse-temurin:21-jdk AS builder
WORKDIR /app
COPY mvnw ./
# Copy .mvn as a directory: `COPY mvnw .mvn ./` flattened .mvn/wrapper into /app and
# left ./mvnw without its wrapper config.
COPY .mvn .mvn
COPY pom.xml ./
# Resolve dependencies in their own layer so source-only changes reuse the cache.
RUN ./mvnw -q -B dependency:go-offline
COPY src ./src
RUN ./mvnw -q -B package -DskipTests

FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=builder /app/target/*.jar app.jar
# A fixed non-root user. No RUN in this stage, so building it for another CPU (ARM64 on
# an x86 CI runner) needs no emulation.
USER 10001:10001
# That user has no home directory: keep caches (the tokenizer for local embeddings, DJL)
# in /tmp, which it can write to.
ENV HOME=/tmp DJL_CACHE_DIR=/tmp/djl.ai
EXPOSE 8080
# No curl or wget in this image: ask /actuator/health over bash's /dev/tcp.
HEALTHCHECK --interval=30s --timeout=5s --start-period=90s --retries=3 \
  CMD bash -c 'exec 3<>/dev/tcp/127.0.0.1/8080 && printf "GET /actuator/health HTTP/1.0\r\nHost: localhost\r\n\r\n" >&3 && grep -q "\"UP\"" <&3' || exit 1
# Size the heap from the container's memory limit rather than the host's. (There is no
# -XX:+UseVirtualThreads JVM flag; virtual threads are a Spring setting:
# spring.threads.virtual.enabled.)
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75", "-Duser.home=/tmp", "-jar", "app.jar"]

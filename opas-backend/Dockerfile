FROM eclipse-temurin:21-jdk-alpine AS builder
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

FROM eclipse-temurin:21-jre-alpine
RUN addgroup -S app && adduser -S app -G app
WORKDIR /app
COPY --from=builder /app/target/*.jar app.jar
USER app
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD wget -qO- http://localhost:8080/actuator/health || exit 1
# Size the heap from the container's memory limit rather than the host's. (There is no
# -XX:+UseVirtualThreads JVM flag; virtual threads are a Spring setting:
# spring.threads.virtual.enabled.)
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75", "-jar", "app.jar"]

FROM eclipse-temurin:21-jdk-alpine AS builder
WORKDIR /app
COPY mvnw .mvn ./
COPY pom.xml .
COPY src ./src
RUN ./mvnw package -DskipTests 

FROM eclipse-temurin:21-jre-alpine
RUN addgroup -S app && adduser -S app -G app
WORKDIR /app
COPY --from=builder /app/target/*.jar app.jar
USER app
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD wget -qO- http://localhost:8080/actuator/health || exit 1
ENTRYPOINT ["java", "-XX:+UseVirtualThreads", "-jar", "app.jar"]

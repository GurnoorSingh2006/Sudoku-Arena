# Build stage
FROM maven:3.9.8-eclipse-temurin-21-alpine AS build
WORKDIR /app

# Copy pom.xml and download dependencies to leverage Docker caching
COPY pom.xml .
RUN mvn dependency:go-offline -B

# Copy source code and build the package
COPY src ./src
RUN mvn package -DskipTests

# Run stage
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar

# Expose server port
EXPOSE 8080

# Run the jar with production profile
ENTRYPOINT ["java", "-jar", "app.jar", "--spring.profiles.active=prod"]

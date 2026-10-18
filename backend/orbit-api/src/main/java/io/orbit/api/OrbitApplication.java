package io.orbit.api;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/** Orbit Monitor entry point: wires every domain into a single local process. */
@SpringBootApplication(scanBasePackages = "io.orbit")
public class OrbitApplication {

    public static void main(String[] args) {
        SpringApplication.run(OrbitApplication.class, args);
    }
}

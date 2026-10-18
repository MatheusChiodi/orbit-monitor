package io.orbit.api;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/** Ponto de entrada do Orbit Monitor: agrega todos os domínios num único processo. */
@SpringBootApplication(scanBasePackages = "io.orbit")
public class OrbitApplication {

    public static void main(String[] args) {
        SpringApplication.run(OrbitApplication.class, args);
    }
}

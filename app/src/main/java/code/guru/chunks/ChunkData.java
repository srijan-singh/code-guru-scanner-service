/* code-guru-scanner-worker
 * Copyright (C) 2025 Srijan Singh
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details:
 *     https://www.gnu.org/licenses/gpl-3.0.txt
 */
package code.guru.chunks;

import java.util.List;

import lombok.Builder;

/**
 * Represents a semantic unit of a Java class—specifically a method—
 * enriched with structural and relational information used for
 * inter-method and inter-attribute analysis across classes.
 *
 * @author Srijan Singh
 */
@Builder
public class ChunkData {

    /**
     * Fully qualified name of the class containing the method.
     * Example: {@code code.guru.chunks.ChunkData}
     */
    String className;


    /**
     * Java Docs associated with the method.
     */
    String docs;

    /**
     * Simple method name (without class or parameters).
     * Example: {@code getMethodName}
     */
    String methodName;

    /**
     * Return type of the method.
     * Example: {@code String}, {@code List<ChunkData>}
     */
    String returnType;

    /**
     * List of method parameters represented as strings, e.g., {@code "int id"}, {@code "String name"}.
     */
    List<String> parameters;

    /**
     * List of class-level fields in the format {@code "fieldName:Type"}.
     * These represent attributes that may be accessed within or across methods.
     */
    List<String> classAttributes;

    /**
     * List of fully qualified method names (FQNs) that call this method.
     * Used to build reverse call graphs or determine upstream dependencies.
     * <p>
     * Example entry: {@code com.example.controller.UserController.getUserById}
     *
     * @see ChunkData#dependencies
     */
    List<String> calledBy;

    /**
     * List of fully qualified methods or fields this method directly depends on.
     * This includes other methods it calls or fields it accesses.
     * <p>
     * Example entries:
     * <ul>
     *   <li>{@code com.example.repository.UserRepository.findById}</li>
     *   <li>{@code com.example.model.User.name}</li>
     * </ul>
     *
     * @see ChunkData#calledBy
     */
    List<String> dependencies;

    /**
     * Raw PSI-extracted source code of the method, including annotations and body.
     * Useful for reference, NLP, or display in tooling.
     */
    String methodCode;

    @Override
    public String toString() {
        return "ChunkData{" +
                "className='" + className + '\'' +
                ", docs='" + docs + '\'' +
                ", methodName='" + methodName + '\'' +
                ", returnType='" + returnType + '\'' +
                ", parameters=" + parameters +
                ", classAttributes=" + classAttributes +
                ", calledBy=" + calledBy +
                ", dependencies=" + dependencies +
                ", methodCode='" + methodCode + '\'' +
                '}';
    }
}

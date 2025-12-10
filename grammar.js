/**
 * @file A language that interfaces with Citect/PlantSCADA
 * @author Sebastian Gazey
 * @license MIT
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

module.exports = grammar({
  name: "cicode",

    // Skip carriage returns
    extras: ($) => ["\r",
                    $.whitespace,
                    $.comment,
                    // TODO: add comment in here
                   ],
    rules: {
        // TODO: add the actual grammar rules
        source_file: $ => repeat($._definition),

        whitespace: ($) => /\s/,

        comment: ($) => token(choice(
            seq("//", /.*/),
            seq("!", /.*/),
            seq("/*", /[^*]*\*+([^/*][^*]*\*+)*/, "/"))),

        _definition: $ => choice(
          $.function_definition
          // TODO: other kinds of definitions - global ect
        ),

        function_scope: $ => choice(
            'PUBLIC',
            'PRIVATE'
        ),

        _type: $ => choice(
            'INT',
            'STRING',
            'REAL',
            'QUALITY',
            'TIMESTAMP',
            'BOOL',
        ),

        function_types: $ => choice(
            $._type,
            'VOID'
            // Functions *should* only use types of _type, but you can have no return type, or kinda a VOID type
        ),

        function_name: $ => /[0-9A-Za-z]+/,

        function_definition: $ => seq(
            optional($.function_scope),
            optional($.function_types),
            'FUNCTION',
            $.function_name
        )
  }
});

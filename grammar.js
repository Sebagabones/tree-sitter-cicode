/**
 * @file A language that interfaces with Citect/PlantSCADA
 * @author Sebastian Gazey
 * @license MIT
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

module.exports = grammar({
    name: "cicode",
    // TODO: Look into injection for the comments https://www.jonashietala.se/blog/2024/03/19/lets_create_a_tree-sitter_grammar/#Language-injection - it may be better to just do simple version ourselves that lets us define the type as docstirng, buuut we could probs do that anyway, idk

    extras: ($) => ["\r", "\n", $._whitespace, $.comment],
    conflicts: ($) => [
        [$.format_specifier_shortform_notation, $.format_specifier],
    ],
    supertypes: ($) => [$.statement_or_expression],
    rules: {
        // TODO: add the actual grammar rules
        source_file: ($) => repeat($._definition),

        _whitespace: ($) => /\s/,

        mathematical_operators: ($) => choice("+", "-", "*", "/", "MOD"),
        bit_operators: ($) => choice("BITAND", "BITOR", "BITXOR"),
        relational_operators: ($) => choice("=", "<>", "<", ">", "<=", ">="),
        logical_operators: ($) => choice("AND", "OR", "NOT"),

        operators_used_in_statements: ($) =>
            choice($.mathematical_operators, $.bit_operators),
        operators_used_in_conditionals: ($) =>
            choice($.relational_operators, $.logical_operators),

        comment: ($) =>
            token(
                choice(
                    seq("//", /.*/),
                    seq("!", /.*/),
                    seq("/*", /[^*]*\*+([^/*][^*]*\*+)*/, "/"),
                ),
            ),

        _definition: ($) =>
            choice(
                $.a_function,
                // TODO: other kinds of definitions - global ect
            ),

        a_function: ($) =>
            seq(
                $.function_definition,
                optional(repeat($.variable_declaration)),
                optional(repeat($.statement_or_expression)),
                optional($.return_statment),
                "END",
            ),
        function_scope: ($) => choice("PUBLIC", "PRIVATE"),

        _type: ($) =>
            choice(
                "INT",
                "STRING",
                "REAL",
                "QUALITY",
                "TIMESTAMP",
                "BOOL",
                "OBJECT",
                "LONG", // IDK, their docs dont mention it iirc, but their examples do
            ),

        parameter_name: ($) => /[0-9A-Za-z-_]+/,
        /*
          I don’t think cicode has any rules about what a variable name can be, except for, and I quote:
          "The first 32 characters of a variable name needs to be unique." - https://docs.aveva.com/bundle/plant-scada/page/1130531.html
          That is not going to be implemented here.
        */

        number: ($) => /[0-9]+/,

        string: ($) => seq('"', repeat(choice(/[^\^"]/, /\^./)), '"'),

        parameter_type: ($) => $._type,

        default_value: ($) => seq("=", choice($.number, $.string)),

        assign_to_value: ($) =>
            seq("=", choice($.number, $.string, $.variable_name)),

        function_parameter: ($) =>
            seq(
                field("type", $.parameter_type),
                field("name", $.parameter_name),
                optional(field("defaultval", $.default_value)),
            ),
        // Note that you cannot use default values infront of normal values, at some point I should fix that but eh

        function_parameters: ($) =>
            seq(
                $.function_parameter,
                optional(repeat(seq(",", $.function_parameter))),
            ),

        function_types: ($) =>
            choice(
                $._type,
                "VOID",
                // Functions *should* only use types of _type, but you can have no return type, or kinda a VOID type
            ),

        function_name: ($) => /[0-9A-Za-z]+/,

        function_definition: ($) =>
            seq(
                field("scope", optional($.function_scope)),
                field("returnType", optional($.function_types)),
                "FUNCTION",
                field("name", $.function_name),
                "(",
                field("parameters", optional($.function_parameters)),
                ")",
                "\n",
            ),

        variable_type: ($) => $._type,

        variable_name: ($) => /[0-9A-Za-z]+/,

        variable_declaration: ($) =>
            seq(
                field("varType", $.variable_type),
                $.variable_name,
                optional($.assign_to_value),
                optional(
                    repeat(
                        seq(",", $.variable_name, optional($.assign_to_value)),
                    ),
                ),
                ";",
            ),

        variable_declarations: ($) => $.variable_declaration,

        expression_atom: ($) =>
            choice(
                $.variable_name,
                $.string,
                $.number,
                seq("(", $.expression, ")"),
                prec.right(2, seq("-", $.expression_atom)), // unary minus
                $.function_call,
            ),

        expression: ($) =>
            choice(
                $.expression_atom,
                prec.left(
                    1,
                    seq(
                        $.expression,
                        $.operators_used_in_statements,
                        $.expression,
                    ),
                ),
            ),

        statement_or_expression: ($) =>
            choice(
                $.variable_assignment,
                field("IfStatement", $.if_statement),
                field("SelectCase", $.select_case_statement),
            ),

        variable_assignment: ($) =>
            seq(
                $.variable_name,
                "=",
                $.expression,
                optional($.format_specifier),
                ";",
            ),

        format_specifier_hash: ($) => "#",
        format_specifier_padding: ($) => "0",
        format_specifier_justification: ($) => "-",
        format_specifier_decimal_notation: ($) => ".",
        format_specifier_engineering_units: ($) => /[A-Za-z]+/,
        format_specifier_exponential_notation: ($) => "S",

        format_specifier: ($) =>
            seq(
                ":",
                choice(
                    $.format_specifier_shortform_notation,
                    repeat(
                        choice(
                            $.format_specifier_hash,
                            $.format_specifier_padding,
                            $.format_specifier_justification,
                            $.format_specifier_decimal_notation,
                            $.format_specifier_engineering_units,
                            $.format_specifier_exponential_notation,
                        ),
                    ),
                ),
            ),
        format_specifier_shortform_number: ($) => /[0-9]+/,

        format_specifier_shortform_notation: ($) =>
            seq(
                repeat1(
                    choice(
                        $.format_specifier_shortform_number,
                        $.format_specifier_engineering_units,
                        $.format_specifier_exponential_notation,
                    ),
                ),
                optional(
                    seq(
                        $.format_specifier_decimal_notation,
                        repeat(
                            choice(
                                $.format_specifier_shortform_number,
                                $.format_specifier_engineering_units,
                                $.format_specifier_exponential_notation,
                            ),
                        ),
                    ),
                ),
            ),

        function_call: ($) =>
            seq(
                $.function_name,
                "(",
                optional(field("functionParameter", $.expression)),
                repeat(seq(",", field("functionParameter", $.expression))),
                ")",
            ),

        conditional_atom: ($) =>
            choice(
                $.variable_name,
                seq("(", $.conditional_statement, ")"),
                prec.right(2, seq("NOT", $.conditional_atom)), // unary NOT
                $.function_call,
            ),

        conditional_statement: ($) =>
            choice(
                $.conditional_atom,

                prec.left(
                    1,
                    seq(
                        $.conditional_statement,
                        $.operators_used_in_conditionals,
                        $.conditional_statement,
                    ),
                ),
            ),

        if_statement: ($) =>
            seq(
                "IF",
                $.conditional_statement,
                "THEN",
                optional(repeat($.statement_or_expression)),
                optional($.return_statment),
                optional(
                    seq(
                        "ELSE",
                        optional($.statement_or_expression),
                        optional($.return_statment),
                    ),
                ),
                "END",
            ),

        to_statement: ($) => seq($.expression_atom, "TO", $.expression_atom),

        case_expression: ($) =>
            choice(
                $.expression_atom,
                $.to_statement,
                $.select_case_conditional_statement,
            ),

        select_case_conditional_statement: ($) =>
            seq(
                "IS",
                $.operators_used_in_conditionals,
                $.conditional_statement,
            ),
        select_case_statement: ($) =>
            seq(
                "SELECT CASE",
                $.conditional_statement,
                repeat(seq(field("Case", $.case_statement))),
                optional(
                    seq(
                        "CASE ELSE",
                        optional($.statement_or_expression),
                        optional($.return_statment),
                    ),
                ),
                "END SELECT",
            ),
        return_statment: ($) => seq("RETURN", choice($.expression), ";"),

        case_statement: ($) =>
            seq(
                "CASE",

                seq($.case_expression, repeat(seq(",", $.case_expression))),
                seq(
                    repeat($.statement_or_expression),
                    optional($.return_statment),
                ),
            ),
    },
});

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
    externals: ($) => [
        $.doxygen_summary_content,
        $.doxygen_param_content,
        $.doxygen_returns_content,
    ],
    word: ($) => $.identifier,
    extras: ($) => ["\r", "\n", $._whitespace, $.comment],
    conflicts: ($) => [
        [$.format_specifier_shortform_notation, $.format_specifier],
        [$.array_scope, $.variable_scope],
    ],
    supertypes: ($) => [
        $.statement,
        $.expression_atom,
        $.conditional_atom,
        $.operators_used_in_statements,
        $.operators_used_in_conditionals,
        $.expression_,
    ],

    rules: {
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
                    token(seq(/(\/\*[^\*])/, /[^*]*\*+([^/*][^*]*\*+)*/, "/")), // this is janky as HELL
                    "/**/", // this is even more janky
                ),
            ),

        _definition: ($) =>
            choice(
                $.a_function,
                $.variable_declaration,
                $.array_declaration, // cannot be inside of function body - at least, i dont think a module declaration inside of a function would work? idk, should test it sometime
            ),

        function_end: ($) => "END",

        a_function: ($) =>
            seq(
                optional($.xml_function_docstring),
                $.function_definition,
                optional(repeat($.variable_declaration)),
                optional(repeat($.statement)),
                optional($.return_statment),
                $.function_end,
            ),

        function_scope: ($) => choice("PUBLIC", "PRIVATE"),

        type: ($) =>
            choice(
                "INT",
                "STRING",
                "REAL",
                "QUALITY",
                "TIMESTAMP",
                "BOOL",
                "OBJECT",
                "LONG", // IDK, their docs dont mention it iirc, but their examples do
                "VOID", // Only valid for functions, but eh
            ),

        number: ($) => /[0-9]+/,

        string_contents: ($) => repeat1(choice(/[^\^"]/, /\^./)),

        quotation_mark: ($) => '"',

        string: ($) =>
            seq(
                $.quotation_mark,
                optional($.string_contents),
                $.quotation_mark,
            ),

        _default_value_equals_sign: ($) => "=",

        default_value: ($) =>
            seq($._default_value_equals_sign, choice($.number, $.string)),

        assign_to_value: ($) =>
            seq("=", $.expression_, optional($.format_specifier)),

        function_parameter: ($) =>
            seq(
                field("parameter_type", $.type),
                field("parameter_name", $.identifier) /*
          I don’t think cicode has any rules about what a variable name can be, except for, and I quote:
          "The first 32 characters of a variable name needs to be unique." - https://docs.aveva.com/bundle/plant-scada/page/1130531.html
          That is not going to be implemented here.
        */,
                optional(field("defaultval", $.default_value)),
            ),
        // Note that you cannot use default values infront of normal values, at some point I should fix that but eh

        function_parameters: ($) =>
            seq(
                $.function_parameter,
                optional(repeat(seq(",", $.function_parameter))),
            ),

        identifier: ($) => /[0-9A-Za-z]+/,

        function_definition: ($) =>
            seq(
                field("scope", optional($.function_scope)),
                field("return_type", optional($.type)),
                "FUNCTION",
                field("function_name", $.identifier),
                "(",
                field("parameters", optional($.function_parameters)),
                ")",
                "\n",
            ),
        global_variable_scope: ($) => "GLOBAL",
        module_variable_scope: ($) => "MODULE",
        local_variable_scope: ($) => "LOCAL",
        variable_scope: ($) =>
            choice(
                $.global_variable_scope,
                $.module_variable_scope,
                $.local_variable_scope,
            ),
        variable_declaration: (
            $, // I guess technically this is a statement, and should go inside of that, however, in cicode you need to declare all of your variables first, so keeping it here
        ) =>
            seq(
                optional(field("variable_scope", $.variable_scope)),
                field("variable_type", $.type),
                field("variable", $.identifier),
                optional($.assign_to_value),
                optional(
                    repeat(
                        seq(
                            ",",
                            field("variable", $.identifier),
                            optional($.assign_to_value),
                        ),
                    ),
                ),
                ";",
            ),
        array_scope: (
            $, // can’t have local scope arrays
        ) => choice($.global_variable_scope, $.module_variable_scope),

        array_initial_values: ($) =>
            seq(
                "=",
                $.expression_,
                optional($.format_specifier),
                repeat(seq(",", $.expression_, optional($.format_specifier))),
            ),
        array_brackets_index: ($) =>
            repeat1(seq("[", field("array_dimension_size", $.number), "]")),
        array_declaration: ($) =>
            seq(
                optional(field("array_scope", $.array_scope)),
                field("array_type", $.type),
                field("array", $.identifier),
                field("array_dimensions", $.array_brackets_index),
                optional(field("array_initial_values", $.array_initial_values)),
                ";",
            ),

        expression_in_brackets: ($) => seq("(", $.expression_, ")"),
        unary_minus_negation_symbol: ($) => "-",
        unary_minus_expression_atom: ($) =>
            prec.right(
                2,
                seq($.unary_minus_negation_symbol, $.expression_atom),
            ), // unary minus

        expression_atom: ($) =>
            choice(
                $.identifier,
                $.string,
                $.number,
                $.expression_in_brackets,
                $.unary_minus_expression_atom,
                $.function_call,
            ),

        expression: ($) =>
            prec.left(
                1,
                seq(
                    $.expression_,
                    $.operators_used_in_statements,
                    $.expression_,
                ),
            ),

        expression_: ($) => choice($.expression_atom, $.expression),

        statement: ($) =>
            choice(
                $.variable_assignment,
                field("if_statement", $.if_statement),
                field("select_case", $.select_case_statement),
            ),

        variable_assignment: ($) =>
            seq(
                field("variable", $.identifier),
                optional(field("array_dimensions", $.array_brackets_index)),
                $.assign_to_value,
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
                field("function_name", $.identifier),
                "(",
                optional(field("function_parameter", $.expression_)),
                repeat(seq(",", field("function_parameter", $.expression_))),
                ")",
            ),

        conditional_expression_in_brackets: ($) =>
            seq("(", $.conditional_expression, ")"),
        unary_not_conditional_atom: ($) =>
            prec.right(2, seq("NOT", $.conditional_atom)), // unary NOT

        conditional_atom: ($) =>
            choice(
                $.identifier,
                $.conditional_expression_in_brackets,
                $.unary_not_conditional_atom,
                $.function_call,
            ),

        conditional_expression: ($) =>
            choice(
                $.conditional_atom,
                prec.left(
                    1,
                    seq(
                        $.conditional_expression,
                        $.operators_used_in_conditionals,
                        $.conditional_expression,
                    ),
                ),
            ),

        if_statement: ($) =>
            seq(
                "IF",
                $.conditional_expression,
                "THEN",
                optional(repeat($.statement)),
                optional($.return_statment),
                optional(
                    seq(
                        "ELSE",
                        optional($.statement),
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
                $.select_case_conditional_expression,
            ),

        select_case_conditional_expression: ($) =>
            seq(
                "IS",
                $.operators_used_in_conditionals,
                $.conditional_expression,
            ),
        select_case_statement: ($) =>
            seq(
                "SELECT CASE",
                $.conditional_expression,
                repeat(seq(field("case", $.case_statement))),
                optional(field("case_else", $.case_else_statement)),
                "END SELECT",
            ),
        return_statment: ($) => seq("RETURN", choice($.expression_), ";"),

        case_statement: ($) =>
            seq(
                "CASE",
                seq($.case_expression, repeat(seq(",", $.case_expression))),
                seq(repeat($.statement), optional($.return_statment)),
            ),
        case_else_statement: ($) =>
            seq(
                "CASE ELSE",
                optional($.statement),
                optional($.return_statment),
            ),

        /*********************************************************
         *              Doxygen XML Docstrings                   *
         *                                                       *
         *********************************************************/

        delimited_comment_doxygen_xml_opening: ($) => "/**",

        delimited_comment_doxygen_xml_closing: ($) => "**/",

        // xml_docstring_contents: ($) => repeat1(seq(/[^\n]*/, "\n")),
        xml_docstring_contents: ($) =>
            repeat1(
                choice(
                    $.doxygen_summary_xml_tag,
                    $.doxygen_param_xml_tag,
                    field("returns_contents", $.doxygen_returns_xml_tag),
                ),
            ),

        xml_function_docstring: ($) =>
            seq(
                $.delimited_comment_doxygen_xml_opening,
                optional($.xml_docstring_contents),
                $.delimited_comment_doxygen_xml_closing,
            ),

        /******************************************************
         *               Doxygen XML Commands                 *
         ******************************************************/

        // <summary>
        doxygen_summary_xml_tag: ($) =>
            seq(
                $.doxygen_summary_xml_open_tag,
                field("summary_contents", $.doxygen_summary_content),
                $.doxygen_summary_xml_close_tag,
            ),
        doxygen_summary_xml_open_tag: ($) => token(seq("<summary>")),
        doxygen_summary_xml_close_tag: ($) => token(seq("</summary>")),

        // <param name="paramName">
        doxygen_param_xml_tag: ($) =>
            seq(
                $.doxygen_param_xml_open_tag,
                optional($.doxygen_param_xml_close_opening_tag_name),
                $.doxygen_param_xml_close_opening_tag,
                field("param_contents", $.doxygen_param_content),
                $.doxygen_param_xml_close_tag,
            ),
        doxygen_param_xml_open_tag: ($) => token(seq("<param")),
        doxygen_param_xml_close_tag: ($) => token(seq("</param>")),
        doxygen_param_xml_close_opening_tag: ($) => token(seq(">")),
        doxygen_param_xml_close_opening_tag_name: ($) =>
            seq(
                token(seq("name", "=")),
                $.quotation_mark,
                field("parameter_name", $.identifier),
                $.quotation_mark,
            ),

        // <returns>
        doxygen_returns_xml_tag: ($) =>
            seq(
                $.doxygen_returns_xml_open_tag,
                $.doxygen_returns_content,
                $.doxygen_returns_xml_close_tag,
            ),
        doxygen_returns_xml_open_tag: ($) => token(seq("<returns>")),
        doxygen_returns_xml_close_tag: ($) => token(seq("</returns>")),
    },
});

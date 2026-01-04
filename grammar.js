/**
 * @file A language that interfaces with Citect/PlantSCADA
 * @author Sebastian Gazey
 * @license MIT
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

module.exports = grammar({
    name: "cicode",
    // TODO: Add a bunch of things to keywords
    // TODO: Still need to do scope
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
        [$.xml_function_docstring, $.xml_non_function_docstring],
    ],
    supertypes: ($) => [
        $.statement,
        $.expression_atom,
        $.conditional_atom,
        $.operators_used_in_statements,
        $.operators_used_in_conditionals,
        $.expression_,
    ],
    reserved: {
        global: ($) => [
            "END",
            "FUNCTION",
            "RETURN",
            "PRIVATE",
            "PUBLIC",
            "INT",
            "STRING",
            "REAL",
            "QUALITY",
            "TIMESTAMP",
            "BOOL",
            "OBJECT",
            "LONG",
            "VOID",
            "CASE ELSE",
            "CASE",
            "IS",
            "SELECT CASE",
            "END SELECT",
            "IF",
            "THEN",
            "ELSE",
            "TO",
            "FOR",
            "DO",
            "WHILE",
        ],
    },
    rules: {
        source_file: ($) => repeat($._definition),

        _whitespace: ($) => /\s/,

        mathematical_operators: ($) => choice("+", "-", "*", "/", "MOD"),
        bit_operators_bitand_keyword: (_) => token("BITAND"),
        bit_operators_bitor_keyword: (_) => token("BITOR"),
        bit_operators_bitxor_keyword: (_) => token("BITXOR"),
        bit_operators: ($) =>
            choice(
                $.bit_operators_bitand_keyword,
                $.bit_operators_bitor_keyword,
                $.bit_operators_bitxor_keyword,
            ),
        relational_operators: ($) => choice("=", "<>", "<", ">", "<=", ">="),
        _logical_operators_and_keyword: (_) => token("AND"),
        _logical_operators_or_keyword: (_) => token("OR"),
        _logical_operators_not_keyword: (_) => token("NOT"),

        logical_operators: ($) =>
            choice(
                $._logical_operators_or_keyword,
                $._logical_operators_not_keyword,
                $._logical_operators_and_keyword,
            ),

        operators_used_in_statements: ($) =>
            choice($.mathematical_operators, $.bit_operators),
        operators_used_in_conditionals: ($) =>
            choice($.relational_operators, $.logical_operators),

        comment: ($) =>
            token(
                choice(
                    seq("//", /.*/),
                    seq("!", /.*/),
                    token(seq(/(\/\*[^\*])/, /[^*]*\*+([^\/*][^*]*\*+)*/, "/")), // this is janky as HELL
                    "/**/", // this is even more janky
                ),
            ),

        _definition: ($) =>
            choice(
                $.a_function,
                $.xml_non_function_docstring,
                $.variable_declaration,
                $.array_declaration, // cannot be inside of function body - at least, i dont think a module declaration inside of a function would work? idk, should test it sometime
            ),

        function_end: ($) => token("END"),

        a_function: ($) =>
            seq(
                optional($.xml_function_docstring),
                $.function_definition,
                optional(repeat($.variable_declaration)),
                optional(repeat($.statement)),
                optional($.return_statment),
                $.function_end,
            ),
        function_scope_public_keyword: ($) => token("PUBLIC"),
        function_scope_private_keyword: ($) => token("PRIVATE"),

        function_scope: ($) =>
            choice(
                $.function_scope_public_keyword,
                $.function_scope_private_keyword,
            ),
        _int_keyword: (_) => token("INT"),
        _string_keyword: (_) => token("STRING"),
        _real_keyword: (_) => token("REAL"),
        _quality_keyword: (_) => token("QUALITY"),
        _timestamp_keyword: (_) => token("TIMESTAMP"),
        _bool_keyword: (_) => token("BOOL"),
        _object_keyword: (_) => token("OBJECT"),
        _long_keyword: (_) => token("LONG"),
        _void_keyword: (_) => token("VOID"),

        type: ($) =>
            choice(
                $._int_keyword,
                $._string_keyword,
                $._real_keyword,
                $._quality_keyword,
                $._timestamp_keyword,
                $._bool_keyword,
                $._object_keyword,
                $._long_keyword, // IDK, their docs dont mention it iirc, but their examples do
                $._void_keyword, // Only valid for functions, but eh
            ),

        number: ($) => prec(2, /[0-9]+/),

        string_contents: ($) => repeat1(choice(/[^\^"]/, /\^./)),

        punctuation_quotation_mark: ($) => token('"'),
        punctuation_semicolon: ($) => token(seq(";", optional(""))), // somehow having the optional whitespace speeds up the parser?
        punctuation_comma: ($) => token(","),
        punctuation_bracket_open: ($) => token("("),
        punctuation_bracket_close: ($) => token(")"),
        punctuation_equals_sign: ($) => token(seq("=", optional(""))),

        string: ($) =>
            seq(
                $.punctuation_quotation_mark,
                optional($.string_contents),
                $.punctuation_quotation_mark,
            ),

        default_value: ($) =>
            seq(
                field("default_value_equals_sign", $.punctuation_equals_sign),
                choice($.number, $.string),
            ),

        assign_to_value: ($) =>
            seq(
                field("assign_to_value_equals_sign", $.punctuation_equals_sign),
                $.expression_,
                optional($.format_specifier),
            ),

        function_parameter: ($) =>
            seq(
                field("parameter_type", $.type),
                field(
                    "parameter_name",
                    choice($.identifier, $.array_variable),
                ) /*
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
                optional(
                    repeat(seq($.punctuation_comma, $.function_parameter)),
                ),
            ),

        identifier: ($) => /[0-9A-Za-z]+/,
        function_keyword: ($) => token("FUNCTION"),
        function_definition: ($) =>
            seq(
                field("scope", optional($.function_scope)),
                field("return_type", optional($.type)),
                $.function_keyword,
                field("function_name", $.identifier),
                field(
                    "function_definition_bracket_open",
                    $.punctuation_bracket_open,
                ),
                field("parameters", optional($.function_parameters)),
                field(
                    "function_definition_bracket_close",
                    $.punctuation_bracket_close,
                ),
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
                            $.punctuation_comma,
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
        array_variable: ($) => seq($.identifier, $.array_brackets_index),
        array_initial_values: ($) =>
            seq(
                field(
                    "array_initial_values_equals_sign",
                    $.punctuation_equals_sign,
                ),
                $.expression_,
                optional($.format_specifier),
                repeat(
                    seq(
                        $.punctuation_comma,
                        $.expression_,
                        optional($.format_specifier),
                    ),
                ),
            ),
        array_brackets_index: ($) =>
            repeat1(
                seq("[", field("array_dimension_size", $.expression_atom), "]"),
            ),

        array_declaration: ($) =>
            seq(
                optional(field("array_scope", $.array_scope)),
                field("array_type", $.type),
                field("array", $.identifier),
                field("array_dimensions", $.array_brackets_index),
                optional(field("array_initial_values", $.array_initial_values)),
                $.punctuation_semicolon,
            ),

        expression_in_brackets: ($) =>
            seq(
                field("expression_open_brackets", $.punctuation_bracket_open),
                $.expression_,
                field("expression_close_brackets", $.punctuation_bracket_close),
            ),
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
                $.array_variable,
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
                $.statement_function_call,
                $.for_loop,
                $.while_loop,
                $.variable_assignment,
                field("if_statement", $.if_statement),
                field("select_case", $.select_case_statement),
            ),

        variable_assignment: ($) =>
            seq(
                field("variable", $.identifier),
                optional(field("array_dimensions", $.array_brackets_index)),
                $.assign_to_value,
                $.punctuation_semicolon,
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
        statement_function_call: ($) =>
            seq($.function_call, $.punctuation_semicolon),
        function_call: ($) =>
            seq(
                field("function_name", $.identifier),
                field("function_call_bracket_open", $.punctuation_bracket_open),
                optional(field("function_parameter", $.expression_)),
                repeat(
                    seq(
                        $.punctuation_comma,
                        field("function_parameter", $.expression_),
                    ),
                ),
                field(
                    "function_call_bracket_close",
                    $.punctuation_bracket_close,
                ),
            ),

        conditional_expression_in_brackets: ($) =>
            seq(
                field(
                    "conditional_expression_open_brackets",
                    $.punctuation_bracket_open,
                ),
                $.conditional_expression,
                field(
                    "conditional_expression_close_brackets",
                    $.punctuation_bracket_close,
                ),
            ),
        unary_not_conditional_atom: ($) =>
            prec.right(
                2,
                seq($._logical_operators_not_keyword, $.conditional_atom),
            ), // unary NOT

        conditional_atom: ($) =>
            choice(
                $.identifier,
                $.number,
                $.array_variable,
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
        if_statement_if_keyword: ($) => token("IF"),
        if_statement_then_keyword: ($) => token("THEN"),
        if_statement_else_keyword: ($) => token("ELSE"),
        if_statement_end_keyword: ($) => token("END"), // idk for some reason this was needed to get END as a token and not as string

        if_statement: ($) =>
            seq(
                $.if_statement_if_keyword,
                $.conditional_expression,
                $.if_statement_then_keyword,
                optional(repeat($.statement)),
                optional($.return_statment),
                optional(
                    seq(
                        $.if_statement_else_keyword,
                        optional($.statement),
                        optional($.return_statment),
                    ),
                ),
                $.if_statement_end_keyword,
            ),
        to_statement_to_keyword: ($) => token("TO"),
        to_statement: ($) =>
            seq(
                $.expression_atom,
                $.to_statement_to_keyword,
                $.expression_atom,
            ),

        case_expression: ($) =>
            choice(
                $.expression_atom,
                $.to_statement,
                $.select_case_conditional_expression,
            ),

        select_case_is_keyword: ($) => token("IS"),
        select_case_conditional_expression: ($) =>
            seq(
                $.select_case_is_keyword,
                $.operators_used_in_conditionals,
                $.conditional_expression,
            ),

        select_case_select_case_keyword: ($) => token("SELECT CASE"),
        select_case_end_select_keyword: ($) => token("END SELECT"),
        select_case_statement: ($) =>
            seq(
                $.select_case_select_case_keyword,
                $.conditional_expression,
                repeat(seq(field("case", $.case_statement))),
                optional(field("case_else", $.case_else_statement)),
                $.select_case_end_select_keyword,
            ),

        return_keyword: ($) => token("RETURN"),
        return_statment: ($) =>
            seq(
                $.return_keyword,
                choice($.expression_),
                $.punctuation_semicolon,
            ),
        case_statement_case_keyword: ($) => token("CASE"),
        case_statement: ($) =>
            seq(
                $.case_statement_case_keyword,
                seq(
                    $.case_expression,
                    repeat(seq($.punctuation_comma, $.case_expression)),
                ),
                seq(repeat($.statement), optional($.return_statment)),
            ),
        case_statement_case_else_keyword: ($) => token("CASE ELSE"),
        case_else_statement: ($) =>
            seq(
                $.case_statement_case_else_keyword,
                optional($.statement),
                optional($.return_statment),
            ),
        /****************************************
         *              Loops                   *
         *                                      *
         ***************************************/
        for_loop_for_keyword: ($) => token("FOR"),
        for_loop_do_keyword: ($) => token("DO"),
        for_loop_end_keyword: ($) => token("END"),

        for_loop_iterable: ($) =>
            seq(
                field("for_loop_variable", $.identifier),
                $.assign_to_value,
                $.to_statement_to_keyword,
                $.expression_,
            ),

        for_loop: ($) =>
            seq(
                $.for_loop_for_keyword,
                $.for_loop_iterable,
                $.for_loop_do_keyword,
                repeat1($.statement),
                $.for_loop_end_keyword,
            ),

        while_loop_while_keyword: ($) => token("WHILE"),
        while_loop_do_keyword: ($) => token("DO"),
        while_loop_end_keyword: ($) => token("END"),
        while_loop: ($) =>
            seq(
                $.while_loop_while_keyword,
                $.conditional_expression,
                $.while_loop_do_keyword,
                repeat1($.statement),
                $.while_loop_end_keyword,
            ),

        /*********************************************************
         *              Doxygen XML Docstrings                   *
         *                                                       *
         *********************************************************/

        delimited_comment_doxygen_xml_opening: ($) => "/**",

        delimited_comment_doxygen_xml_closing: ($) => "**/",

        _star_in_xml_comment: ($) => token(seq("*")),

        xml_docstring_contents: ($) =>
            repeat1(
                choice(
                    $._star_in_xml_comment,
                    $.doxygen_summary_xml_tag,
                    $.doxygen_param_xml_tag,
                    field("returns_contents", $.doxygen_returns_xml_tag),
                ),
            ),

        xml_non_function_docstring: ($) =>
            seq(
                $.delimited_comment_doxygen_xml_opening,
                seq(
                    optional($.xml_docstring_contents),
                    $.delimited_comment_doxygen_xml_closing,
                ),
            ),

        xml_function_docstring: ($) =>
            seq(
                $.delimited_comment_doxygen_xml_opening,
                seq(
                    optional($.xml_docstring_contents),
                    $.delimited_comment_doxygen_xml_closing,
                ),
            ),

        doxygen_xml_name_attribute_name_keyword: ($) => "name",

        doxygen_xml_name_attribute: ($) =>
            seq(
                $.doxygen_xml_name_attribute_name_keyword,
                $.punctuation_equals_sign,
                $.punctuation_quotation_mark,
                field("parameter_name", $.identifier),
                $.punctuation_quotation_mark,
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
        doxygen_summary_xml_open_tag: ($) => token("<summary>"),
        doxygen_summary_xml_close_tag: ($) => token("</summary>"),

        // <param name="paramName">
        doxygen_param_xml_tag: ($) =>
            seq(
                $.doxygen_param_xml_open_tag,
                optional($.doxygen_xml_name_attribute),
                $.doxygen_param_xml_close_opening_tag,
                field("param_contents", $.doxygen_param_content),
                $.doxygen_param_xml_close_tag,
            ),
        doxygen_param_xml_open_tag: ($) => token("<param"),
        doxygen_param_xml_close_tag: ($) => token("</param>"),
        doxygen_param_xml_close_opening_tag: ($) => token(">"),

        // <returns>
        doxygen_returns_xml_tag: ($) =>
            seq(
                $.doxygen_returns_xml_open_tag,
                $.doxygen_returns_content,
                $.doxygen_returns_xml_close_tag,
            ),
        doxygen_returns_xml_open_tag: ($) => token("<returns>"),
        doxygen_returns_xml_close_tag: ($) => token("</returns>"),
    },
});

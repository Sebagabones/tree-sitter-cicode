; highlights.scm
;; See https://tree-sitter.github.io/tree-sitter/3-syntax-highlighting#query-paths
;; TODO: Highlighting for the :*** format style
;; keywords
(function_keyword) @keyword
(function_end) @keyword
(return_keyword) @keyword
(if_statement_if_keyword) @keyword
(if_statement_then_keyword) @keyword
(if_statement_else_keyword) @keyword
(if_statement_end_keyword) @keyword
(select_case_select_case_keyword) @keyword
(select_case_end_select_keyword) @keyword
(to_statement_to_keyword) @keyword
(select_case_is_keyword) @keyword
(case_statement_case_keyword) @keyword
(case_statement_case_else_keyword) @keyword
(for_loop_for_keyword) @keyword
(for_loop_do_keyword) @keyword
(for_loop_end_keyword) @keyword
(while_loop_end_keyword) @keyword
(while_loop_while_keyword) @keyword
(while_loop_do_keyword) @keyword



;; punctuation
(punctuation_quotation_mark) @punctuation.special
(punctuation_comma) @punctuation.delimiter
(punctuation_bracket_open) @punctuation.bracket
(punctuation_bracket_close) @punctuation.bracket
(punctuation_semicolon) @punctuation.delimiter

(punctuation_equals_sign) @operator
(operators_used_in_statements) @operator
(operators_used_in_conditionals) @operator
(unary_minus_negation_symbol) @operator




(number) @number
(string) @string

(function_definition function_name: (identifier) @function)
(function_call function_name: (identifier) @function)

(function_definition return_type: (type) @type)

(function_definition (function_parameters (function_parameter parameter_type: (type) @type)))

;; (function_parameter parameter_name: (identifier) @variable.parameter)
;; (function_parameter parameter_name: (array_variable (identifier)) @variable.parameter)

(function_call function_parameter: (identifier) @variable.parameter)
(function_call function_parameter: (array_variable) @variable.parameter)
(function_call function_parameter: (expression  (identifier) @variable.parameter))

(comment) @comment

(xml_function_docstring) @comment.block.documentation
(xml_non_function_docstring) @comment.block.documentation


(variable_declaration variable_type: (type) @type)

(doxygen_xml_name_attribute parameter_name: (identifier) @attribute)
(doxygen_xml_name_attribute_name_keyword) @constructor

(doxygen_summary_xml_open_tag) @property
(doxygen_summary_xml_close_tag) @property

(doxygen_param_xml_open_tag) @property
(doxygen_param_xml_close_opening_tag) @property
(doxygen_param_xml_close_tag) @property

(doxygen_returns_xml_open_tag) @property
(doxygen_returns_xml_close_tag) @property



(variable_scope) @module
(function_scope) @module

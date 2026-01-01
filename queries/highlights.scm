; highlights.scm
;; See https://tree-sitter.github.io/tree-sitter/3-syntax-highlighting#query-paths

"FUNCTION" @keyword
"RETURN" @keyword

(number) @number
(function_definition function_name: (identifier) @function)
(string) @string
(function_definition return_type: (type) @type)
(function_definition (function_parameters (function_parameter parameter_type: (type) @type)))
(unary_minus_negation_symbol) @property

(comment) @comment
(xml_function_docstring) @comment
(variable_declaration variable_type: (type) @type)
(quotation_mark) @type

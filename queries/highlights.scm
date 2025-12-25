; highlights.scm
;; See https://tree-sitter.github.io/tree-sitter/3-syntax-highlighting#query-paths

"FUNCTION" @keyword
"RETURN" @keyword

(number) @number
(function_definition (function_name) @function)
(string) @string
(function_definition returnType: (function_types) @type)
(comment) @comment
(variable_declaration varType: (variable_type) @type)

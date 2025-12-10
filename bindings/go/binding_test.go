package tree_sitter_cicode_test

import (
	"testing"

	tree_sitter "github.com/tree-sitter/go-tree-sitter"
	tree_sitter_cicode "github.com/sebagabones/tree-sitter-cicode/bindings/go"
)

func TestCanLoadGrammar(t *testing.T) {
	language := tree_sitter.NewLanguage(tree_sitter_cicode.Language())
	if language == nil {
		t.Errorf("Error loading Cicode grammar")
	}
}

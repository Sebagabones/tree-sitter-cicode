#include "tree_sitter/parser.h"
#include <stdbool.h>
#include <stddef.h>
#include <string.h>

#define advance_macro(lexer) lexer->advance(lexer, false)

enum TokenType {
  DOXYGEN_SUMMARY_CONTENT,
  DOXYGEN_PARAM_CONTENT,
  DOXYGEN_RETURNS_CONTENT
};

/* Table with supported tags */
struct TagSpec {
  enum TokenType token;
  const char *end_tag; // e.g. "summary>" (without "</")
};

/* add new tags here */
static const struct TagSpec TAGS[] = {
    {DOXYGEN_SUMMARY_CONTENT, "summary>"},
    {DOXYGEN_PARAM_CONTENT, "param>"},
    {DOXYGEN_RETURNS_CONTENT, "returns>"},
};

static bool scan_until_end_tag(TSLexer *lexer, const char *end_tag) {
  bool advanced = false;

  while (!lexer->eof(lexer)) {

    if (lexer->lookahead == '<') {
      lexer->mark_end(lexer);

      advance_macro(lexer);
      if (lexer->lookahead == '/') {
        advance_macro(lexer);

        size_t i = 0;
        while (end_tag[i] && lexer->lookahead == end_tag[i]) {
          advance_macro(lexer);
          i++;
        }

        /* Found </tag> */
        if (end_tag[i] == '\0') {
          return advanced;
        }
      }
    }

    advanced = true;
    advance_macro(lexer);
  }

  return false;
}

bool tree_sitter_cicode_external_scanner_scan(void *payload, TSLexer *lexer,
                                              const bool *valid_symbols) {
  (void)payload;

  for (size_t i = 0; i < sizeof(TAGS) / sizeof(TAGS[0]); i++) {
    const struct TagSpec *tag = &TAGS[i];

    /* Only attempt tokens the parser actually wants */
    if (!valid_symbols[tag->token]) {
      continue;
    }

    if (scan_until_end_tag(lexer, tag->end_tag)) {
      lexer->result_symbol = tag->token;
      return true;
    }

    /* Parser expected this token, but couldn't scan it */
    return false;
  }

  return false;
}

void *tree_sitter_cicode_external_scanner_create(void) { return NULL; }

void tree_sitter_cicode_external_scanner_destroy(void *payload) {
  (void)payload;
}

unsigned tree_sitter_cicode_external_scanner_serialize(void *payload,
                                                       char *buffer) {
  (void)payload;
  (void)buffer;
  return 0;
}

void tree_sitter_cicode_external_scanner_deserialize(void *payload,
                                                     const char *buffer,
                                                     unsigned length) {
  (void)payload;
  (void)buffer;
  (void)length;
}

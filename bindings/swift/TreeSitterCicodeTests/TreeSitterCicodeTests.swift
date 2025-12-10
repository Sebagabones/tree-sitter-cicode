import XCTest
import SwiftTreeSitter
import TreeSitterCicode

final class TreeSitterCicodeTests: XCTestCase {
    func testCanLoadGrammar() throws {
        let parser = Parser()
        let language = Language(language: tree_sitter_cicode())
        XCTAssertNoThrow(try parser.setLanguage(language),
                         "Error loading Cicode grammar")
    }
}

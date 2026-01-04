{
  description = "Tree-Sitter Grammar for CiCode";
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };
  outputs = { self, nixpkgs, flake-utils }:

    flake-utils.lib.eachDefaultSystem (system:
      let pkgs = nixpkgs.legacyPackages.${system};
      in {

        devShell = pkgs.mkShell {
          packages = [
            pkgs.nodejs
            pkgs.graphviz
            pkgs.tree-sitter
            pkgs.rustc
            pkgs.cargo
            pkgs.treefmt
            pkgs.clang-tools
          ];
        };
      });
}

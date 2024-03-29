{
  description = "Toki Nanpa: digital talk";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";

  inputs.flake-utils.url = "github:numtide/flake-utils";

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages."${system}";
      in
      {
        devShell = pkgs.mkShell {
          packages = with pkgs; [
            nodejs-18_x
            yarn
            nodePackages.gitmoji-cli
          ];
          shellHook = ''
            yarn install
          '';
        };
      });
}

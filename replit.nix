{ pkgs }: {
  deps = [
    pkgs.nodejs_20
    pkgs.nodePackages.pnpm
    pkgs.postgresql_15
    pkgs.openssl
  ];
}

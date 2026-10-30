import { describe, expect, it } from "vitest";

import {
  contentPhotoPath,
  csvToImportRows,
  notReadyCodes,
  parseCsv,
  photoProblem,
} from "./content";

describe("CONTEÚDO-1 CSV import", () => {
  it("parses quotes, escaped quotes, semicolons, CRLF and a BOM", () => {
    const csv =
      '﻿tipo;nome_negocio;descricao_negocio\r\nnegocio;"Banca ""da"" Maria";"Peixe; marisco"\r\n';
    expect(parseCsv(csv)).toEqual([
      ["tipo", "nome_negocio", "descricao_negocio"],
      ["negocio", 'Banca "da" Maria', "Peixe; marisco"],
    ]);
  });

  it("detects commas and skips empty lines", () => {
    expect(parseCsv("a,b\n\n1,2\n")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("maps template columns to import rows for businesses and experiences", () => {
    const rows = parseCsv(
      [
        "Tipo;Nome negócio;Província;Categoria;Telefone;Título PT;Categoria atividade;Preço MZN;Capacidade;Dias;Coluna extra",
        "Negócio;Banca da Maria;Inhambane;restaurant;+258 840000000;;;;;;x",
        "Experiência;Banca da Maria;Inhambane;;;Almoço de marisco;food;1 500,50;8;seg,qua;",
      ].join("\n"),
    );
    const { rows: out, unknownColumns } = csvToImportRows(rows);
    expect(unknownColumns).toEqual(["coluna_extra"]);
    expect(out[0]).toMatchObject({
      kind: "business",
      name: "Banca da Maria",
      province: "inhambane",
      category: "restaurant",
      phone: "+258 840000000",
    });
    expect(out[1]).toMatchObject({
      kind: "experience",
      business_name: "Banca da Maria",
      business_province: "inhambane",
      title_pt: "Almoço de marisco",
      category: "food",
      price_mzn: "1500.50",
      capacity: "8",
      days: "seg,qua",
    });
    expect(out[1].name).toBeUndefined();
  });

  it("turns province names into province codes", () => {
    const { rows } = csvToImportRows(
      parseCsv("tipo,provincia\nnegocio,Cabo Delgado\nnegocio,Maputo Cidade"),
    );
    expect(rows.map((r) => r.province)).toEqual(["cabo-delgado", "maputo-cidade"]);
  });
});

describe("CONTEÚDO-1 readiness and photos", () => {
  it("reads the codes of an EXPERIENCE_NOT_READY error", () => {
    expect(notReadyCodes("EXPERIENCE_NOT_READY:price,photo")).toEqual(["price", "photo"]);
    expect(notReadyCodes("something else")).toEqual([]);
  });

  it("accepts only JPEG/PNG/WebP up to 5 MB", () => {
    expect(photoProblem({ type: "image/jpeg", size: 1000 })).toBeNull();
    expect(photoProblem({ type: "image/gif", size: 1000 })).toBe("type");
    expect(photoProblem({ type: "image/webp", size: 6 * 1024 * 1024 })).toBe("size");
  });

  it("finds the storage path of content photos only", () => {
    expect(
      contentPhotoPath(
        "https://x.supabase.co/storage/v1/object/public/content-photos/b1/a%20b.jpg",
      ),
    ).toBe("b1/a b.jpg");
    expect(
      contentPhotoPath("https://x.supabase.co/storage/v1/object/public/avatars/u/a.jpg"),
    ).toBeNull();
  });
});

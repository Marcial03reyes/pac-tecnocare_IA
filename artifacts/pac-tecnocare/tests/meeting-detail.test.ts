import test from "node:test";
import assert from "node:assert/strict";
import { meetingDetail, detailText } from "../src/lib/meeting-detail";
import { whatsappUrl, phoneDigits, emailUrl } from "../src/lib/direct-contact";
import type { Reunion } from "../src/lib/types";

const meeting = (patch: Partial<Reunion> = {}) => ({
  id: "fixture", analisis: null, transcripcion_resumen: "Resumen existente",
  objeciones_detectadas: "Precio", acuerdos_proximo_paso: "Llamar el lunes",
  etapa: "Lead", temperatura: "Frío", borrador_whatsapp: "Hola, ¿conversamos?",
  ...patch,
}) as Reunion;

test("object and JSON analysis share extraction, with aliases taking priority over flat records", () => {
  const analysis = {
    resumen: ["Evaluó el equipo", "Pidió una demo"],
    objeciones_detectadas: ["Precio y tiempo"], acuerdos_proximo_paso: "Demo el lunes",
    recomendacion: { accion: "Enviar ficha" }, borrador: "Hola & gracias\n¿Demo?",
    etapa_actual: "Demo agendada", temperatura_actual: "Caliente",
    demo: { dia: "lunes", hora: "10:00", falta_confirmar: true },
  };
  const parsed = meetingDetail(meeting({ analisis: analysis }));
  assert.deepEqual(parsed, meetingDetail(meeting({ analisis: JSON.stringify(analysis) })));
  assert.equal(parsed.etapa, "Demo agendada");
  assert.equal(parsed.temperatura, "Caliente");
  assert.deepEqual(parsed.objeciones, ["Precio y tiempo"]);
  assert.equal(parsed.acuerdos, "Demo el lunes");
  assert.equal(parsed.borrador, analysis.borrador);
  assert.deepEqual(parsed.demo, analysis.demo);
});

test("malformed, empty and nonobject analysis safely fall back to existing flat fields", () => {
  for (const analysis of [null, "", "bad json", "null", "[]", [], 42, false, {}, { resumen: " " }]) {
    const result = meetingDetail(meeting({ analisis: analysis }));
    assert.equal(result.resumen, "Resumen existente");
    assert.equal(result.etapa, "Lead");
    assert.equal(result.objeciones, "Precio");
    assert.equal(result.recomendacion, null);
    assert.equal(result.demo, null);
  }
});

test("demo supports explicit details without agreed flag and meaningful boolean reminders", () => {
  assert.deepEqual(meetingDetail(meeting({ analisis: { demo: { dia: "lunes", falta_confirmar: true } } })).demo,
    { dia: "lunes", falta_confirmar: true });
  assert.deepEqual(meetingDetail(meeting({ analisis: { demo: '{"lugar":"Clínica"}' } })).demo,
    { lugar: "Clínica" });
  assert.deepEqual(meetingDetail(meeting({ analisis: { demo: false, demo_hora: "14:00" } })).demo,
    { hora: "14:00" });
  assert.equal(detailText({ falta_confirmar: true, vacio: "", ausente: false }), "falta confirmar: Sí");
});

test("compact text preserves multiline draft and renders analysis as plain text without inventing blanks", () => {
  assert.equal(detailText(null), "");
  assert.equal(detailText(false), "");
  assert.equal(detailText(["Primero", "", null, "Segundo"]), "• Primero\n• Segundo");
  assert.equal(detailText("  Hola\n¿Demo?  "), "Hola\n¿Demo?");
  assert.equal(detailText("<script>alert(1)</script>"), "<script>alert(1)</script>");
});

test("contact links encode complete drafts and never invent a missing phone or email", () => {
  const draft = "Hola & gracias\n¿Demo el lunes? + ficha #1";
  const url = new URL(whatsappUrl("999 123 456", draft)!);
  assert.equal(url.hostname, "wa.me");
  assert.equal(url.pathname, "/51999123456");
  assert.equal(url.searchParams.get("text"), draft);
  assert.equal(whatsappUrl(null, draft), null);
  assert.equal(emailUrl(" ", draft), null);
  assert.equal(phoneDigits("+51 999 123 456"), "51999123456");
  assert.ok(emailUrl("demo@example.com", draft)?.startsWith("mailto:"));
});

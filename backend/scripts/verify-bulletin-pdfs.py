"""Contrôle la géométrie et les valeurs des PDF téléchargés dans la recette V1."""
import json
from pathlib import Path
import re
import sys

import fitz


proofs = Path(sys.argv[1])
images = proofs / "rendus-220ppp"
images.mkdir(exist_ok=True)
documents = {}

for file in sorted(proofs.glob("*.pdf")):
    pdf = fitz.open(file)
    if file.name.startswith("AVANT-"):
        for page in pdf:
            page.get_pixmap(dpi=220, alpha=False).save(images / f"{file.stem}-{page.number + 1}.png")
        pdf.close()
        continue
    documents[file.stem] = pdf
    for page in pdf:
        assert abs(min(page.rect.width, page.rect.height) - 595.28) < 0.05, file.name
        assert abs(max(page.rect.width, page.rect.height) - 841.89) < 0.05, file.name
        assert len(page.search_for("DEMO-V1")) == 1, (file.name, page.number)
        for x0, y0, x1, y1, text, *_ in page.get_text("words"):
            assert 24.5 <= x0 < x1 <= page.rect.width - 24.5, (file.name, text, x0, x1)
            assert 23 <= y0 < y1 <= page.rect.height - 13, (file.name, text, y0, y1)
        page.get_pixmap(dpi=220, alpha=False).save(images / f"{file.stem}-{page.number + 1}.png")


def fixtures(stem):
    return json.loads((proofs / f"{stem}.json").read_text())


def normal(text):
    return re.sub(r"\s+", " ", text).strip()


def single(stem):
    pdf = documents[stem]
    assert len(pdf) == 1, stem
    return pdf[0]


def at_y(page, x0, x1, y0, y1):
    words = page.get_text("words")
    return " ".join(word[4] for word in sorted(words, key=lambda word: (word[1], word[0]))
                    if x0 <= (word[0] + word[2]) / 2 <= x1 and y0 <= (word[1] + word[3]) / 2 <= y1)


def row_range(page, label):
    bounds = page.search_for(label)
    assert bounds, label
    # Un intitulé de branche qui tient sur plusieurs lignes occupe la hauteur de toutes ses lignes.
    top = min(rect.y0 for rect in bounds)
    return top, max(rect.y1 for rect in bounds if rect.y0 < top + 27)


def has_vertical(page, x, y0, y1):
    for stroke in page.get_drawings():
        for item in stroke["items"]:
            if item[0] != "l":
                continue
            a, b = item[1:]
            if abs(a.x - x) < 0.12 and abs(b.x - x) < 0.12 and min(a.y, b.y) <= y0 and max(a.y, b.y) >= y1:
                return True
    return False


maternal = single("BULLETIN_MATERNEL_DEMO-V1")
assert maternal.rect.width > maternal.rect.height
assert all(maternal.search_for(title) for title in ["QTE", "QLT", "COUL", "OBSERVATION", "INSTITUTRICE", "PARENT", "DIRECTION", "SCEAU DE L’ÉCOLE"])
assert len(maternal.search_for("QTE")) == len(maternal.search_for("QLT")) == len(maternal.search_for("COUL")) == 6
first_tier = maternal.search_for("1 PÉRIODE")[0]
second_tier = maternal.search_for("QTE")[0]
u = (maternal.rect.width - 58) / 801
attitudes_end = 29 + 178 * u
assert has_vertical(maternal, attitudes_end, first_tier.y0, first_tier.y1)
assert not has_vertical(maternal, attitudes_end + 30 * u, first_tier.y0, first_tier.y1)
assert has_vertical(maternal, attitudes_end + 30 * u, second_tier.y0, second_tier.y1)
observation_tier = maternal.search_for("OBSERVATION")[0]
assert has_vertical(maternal, 29 + (178 + 102 + 104 + 104 + 34 + 31) * u, observation_tier.y0, observation_tier.y1)
assert not has_vertical(maternal, attitudes_end + 30 * u, observation_tier.y0, observation_tier.y1)
signature_top = maternal.search_for("INSTITUTRICE")[0]
for boundary in [24, 178, 384, 593]:
    assert has_vertical(maternal, 29 + boundary * u, signature_top.y0, signature_top.y1)
for index, subject in enumerate(fixtures("BULLETIN_MATERNEL_DEMO-V1")["subjects"]):
    y0, y1 = row_range(maternal, subject["label"])
    if index == 0:
        y0, y1 = second_tier.y1, row_range(maternal, "Participation")[0]
    assert at_y(maternal, attitudes_end, maternal.rect.width - 29, y0, y1).split() == ["D1", "D2", "D3"] * 6

for stem in ["BULLETIN_PRIMAIRE_DEMO-V1"]:
    page = single(stem)
    identity = fixtures(stem)["identity"]
    subjects = fixtures(stem)["subjects"]
    width = page.rect.width - 50
    assert all(page.search_for(title) for title in ["Période 1", "Période 2", "Période 3", "Total /100", "Mention", "TOTAL GÉNÉRAL", "PLACE DE L’ÉLÈVE", "Observation du titulaire", "Observation du directeur"])
    for subject in subjects:
        y0, y1 = row_range(page, subject["label"])
        for i, code in enumerate(["T1", "T2", "T3"]):
            edges = [275, 368, 460, 552]
            x = 25 + edges[i] / 771 * width
            triplet = subject["components"][code]
            expected = f"{triplet['earned']} / {triplet['maximum']}"
            if stem.endswith("non-publiee") and code == "T3":
                expected = ""
            assert at_y(page, x, 25 + edges[i+1] / 771 * width, y0, y1) == expected, (stem, subject["label"], code)
        assert at_y(page, 25 + 552 / 771 * width, page.rect.width - 25, y0, y1) == ""
    y0, y1 = row_range(page, "TOTAL GÉNÉRAL")
    value = "" if stem.endswith("non-publiee") else f"{identity['totalEarned']} / {identity['totalMaximum']}"
    assert at_y(page, 25 + 660 / 771 * width, page.rect.width - 25, y0, y1) == value
    assert not has_vertical(page, 25 + 552 / 771 * width, y0, y1)
    decision_top, decision_bottom = row_range(page, "Décision du conseil de classe")
    assert has_vertical(page, 25 + .385 * width, decision_top, decision_bottom)
    assert not has_vertical(page, 25 + .385 * width + 65, decision_top, decision_bottom)

secondary_headers = ["BRANCHES", "PREMIER SEMESTRE", "SECOND SEMESTRE", "EXAMEN DE REPÊCHAGE", "SIGN. PROF.", "T.G."]
secondary_rows = ["MAXIMA GÉNÉRAUX", "TOTAUX", "POURCENTAGE", "PLACE / NBRE ÉLÈVES", "APPLICATION", "CONDUITE", "SIGN. DU RESPONSABLE"]


def secondary_x(page, reference):
    return 32 + reference * (page.rect.width - 64) / 686


def check_permanent_number(page, value):
    top, bottom = row_range(page, "N° PERM.")
    bounds = [secondary_x(page, 392 + i * 248 / 11) for i in range(12)]
    for edge in bounds:
        assert has_vertical(page, edge, top + 1, bottom - 1), edge
    for i, (x0, x1) in enumerate(zip(bounds, bounds[1:])):
        assert at_y(page, x0, x1, top - 1, bottom + 1) == (value[i] if value else "")


for stem in ["BULLETIN_SECONDAIRE_DEMO-V1", "BULLETIN_SECONDAIRE_ANNUEL_DEMO-V1", "BULLETIN_REPECHAGE_DEMO-V1"]:
    page = single(stem)
    assert all(page.search_for(title) for title in secondary_headers + secondary_rows), stem
    check_permanent_number(page, "")
    x = lambda reference: secondary_x(page, reference)
    admin_top = page.search_for("VILLE")[0].y0
    admin_bottom = page.search_for("N° PERM.")[0].y1
    assert has_vertical(page, x(318), admin_top, admin_bottom)
    assert not has_vertical(page, x(552), admin_top, admin_bottom)
    exam_header = page.search_for("EXAMEN DE REPÊCHAGE")[0]
    sub_header = page.search_for("SIGN. PROF.")[0]
    assert not has_vertical(page, x(591), exam_header.y0, exam_header.y1)
    assert has_vertical(page, x(591), sub_header.y0, sub_header.y1)
    header_text = at_y(page, x(564), x(686), sub_header.y0 - 1, sub_header.y1 + 1)
    assert "%" in header_text and "NOTE" not in header_text, header_text
    total_top = page.search_for("TOTAUX")[0].y0
    conduct_bottom = page.search_for("CONDUITE")[0].y1
    assert has_vertical(page, x(564), total_top, conduct_bottom)
    assert not has_vertical(page, x(591), total_top, conduct_bottom)
    side_text = at_y(page, x(564), x(686), total_top, conduct_bottom)
    assert all(s in side_text for s in ("Passe", "Double", "échoué", "Chef", "Sceau")), side_text

    frozen = fixtures(stem)
    subjects = frozen["subjects"]
    if stem == "BULLETIN_SECONDAIRE_DEMO-V1":
        assert len(subjects) == 20
        assert frozen["identity"]["totalMaximum"] == "400"
        assert len(page.search_for("MAXIMA")) >= 5
        group_rows = [rect for rect in page.search_for("MAXIMA") if rect.y0 < page.search_for("MAXIMA GÉNÉRAUX")[0].y0 - 1]
        for subject in subjects:
            y0, y1 = row_range(page, subject["label"])
            maxima = max((rect for rect in group_rows if rect.y0 < y0), key=lambda rect: rect.y0)
            assert at_y(page, x(126), x(172), maxima.y0, maxima.y1) == subject["maximum"], subject["label"]
            assert at_y(page, x(126), x(172), y0, y1) == subject["earned"], subject["label"]
            assert at_y(page, x(172), x(686), y0, y1) == "", subject["label"]
    else:
        is_retake = "REPECHAGE" in stem
        earlier = fixtures("REPECHAGE-premiere-session") if is_retake else frozen
        for subject in earlier["subjects"]:
            y0, y1 = row_range(page, subject["label"])
            assert at_y(page, x(501), x(546), y0, y1) == subject["earned"]
            assert at_y(page, x(564), x(686), y0, y1) == "", subject["label"]
        y0, y1 = row_range(page, "TOTAUX")
        assert at_y(page, x(501), x(546), y0, y1) == earlier["identity"]["totalEarned"]
        if is_retake:
            assert frozen["identity"]["totalEarned"] == "40"
            assert page.search_for("en Mathématiques")
            assert page.search_for("DEUXIÈME SESSION")
            assert page.search_for("Mathématiques : 40 / 40")
            assert page.search_for("TOTAL : 40 / 1520")
            assert page.search_for(frozen["identity"]["percentage"])

long = documents["secondaire-pagine"]
assert len(long) > 2
text = normal(" ".join(page.get_text() for page in long))
for i, page in enumerate(long):
    if "BRANCHES" in page.get_text():
        assert all(page.search_for(title) for title in secondary_headers)
    assert f"{i + 1} / {len(long)}" in page.get_text()
for name in fixtures("secondaire-pagine")["names"]:
    assert name in text, name
check_permanent_number(long[0], fixtures("secondaire-pagine")["permanentNumber"])
long_name = fixtures("secondaire-pagine")["longName"]
assert re.sub(r"\s+", "", long_name) in re.sub(r"\s+", "", text)
assert "OPTION-FICTIVE" in text
print(f"{len(documents)} documents contrôlés, chaque page rastérisée à 220 ppp.")

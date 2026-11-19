"""Contrôle la géométrie et les valeurs des PDF téléchargés dans la recette V1."""
import json
from pathlib import Path
import re
import sys

import fitz


proofs = Path(sys.argv[1])
images = proofs / "rendus-200ppp"
images.mkdir(exist_ok=True)
documents = {}

for file in sorted(proofs.glob("*.pdf")):
    pdf = fitz.open(file)
    if file.name.startswith("AVANT-"):
        for page in pdf:
            page.get_pixmap(dpi=200, alpha=False).save(images / f"{file.stem}-{page.number + 1}.png")
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
        page.get_pixmap(dpi=200, alpha=False).save(images / f"{file.stem}-{page.number + 1}.png")


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
    return min(rect.y0 for rect in bounds), max(rect.y1 for rect in bounds)


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
first_tier = maternal.search_for("1re PÉRIODE")[0]
second_tier = maternal.search_for("QTE")[0]
slot = (maternal.rect.width - 50 - 180) / 18
assert has_vertical(maternal, 205, first_tier.y0, first_tier.y1)
assert not has_vertical(maternal, 205 + slot, first_tier.y0, first_tier.y1)
assert has_vertical(maternal, 205 + slot, second_tier.y0, second_tier.y1)
for subject in fixtures("BULLETIN_MATERNEL_DEMO-V1")["subjects"]:
    y0, y1 = row_range(maternal, subject["label"])
    assert at_y(maternal, 205, maternal.rect.width - 25, y0, y1).split() == ["D1", "D2", "D3"] * 6

for stem in ["BULLETIN_PRIMAIRE_DEMO-V1", "primaire-periode-non-publiee"]:
    page = single(stem)
    identity = fixtures(stem)["identity"]
    subjects = fixtures(stem)["subjects"]
    width = page.rect.width - 50
    assert all(page.search_for(title) for title in ["Période 1", "Période 2", "Période 3", "Total /100", "Mention", "TOTAL GÉNÉRAL", "PLACE DE L’ÉLÈVE", "Observation du titulaire", "Observation du directeur"])
    for subject in subjects:
        y0, y1 = row_range(page, subject["label"])
        for i, code in enumerate(["T1", "T2", "T3"]):
            x = 25 + (.354 + .119 * i) * width
            triplet = subject["components"][code]
            expected = f"{triplet['earned']} / {triplet['maximum']}"
            if stem.endswith("non-publiee") and code == "T3":
                expected = ""
            assert at_y(page, x, x + .119 * width, y0, y1) == expected, (stem, subject["label"], code)
        assert at_y(page, 25 + .711 * width, page.rect.width - 25, y0, y1) == ""
    y0, y1 = row_range(page, "TOTAL GÉNÉRAL")
    value = "" if stem.endswith("non-publiee") else f"{identity['totalEarned']} / {identity['totalMaximum']}"
    assert at_y(page, 25 + .856 * width, page.rect.width - 25, y0, y1) == value
    assert not has_vertical(page, 25 + .711 * width, y0, y1)

secondary_headers = ["BRANCHES", "PREMIER SEMESTRE", "SECOND SEMESTRE", "EXAMEN DE REPÊCHAGE", "SIGN. PROF.", "T.G."]
secondary_rows = ["MAXIMA GÉNÉRAUX", "TOTAUX", "POURCENTAGE", "PLACE / NOMBRE D’ÉLÈVES", "APPLICATION", "CONDUITE", "SIGNATURE DU RESPONSABLE"]
for stem in ["BULLETIN_SECONDAIRE_DEMO-V1", "BULLETIN_SECONDAIRE_ANNUEL_DEMO-V1", "BULLETIN_REPECHAGE_DEMO-V1"]:
    page = single(stem)
    assert all(page.search_for(title) for title in secondary_headers + secondary_rows), stem
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
            assert at_y(page, 147, 181, maxima.y0, maxima.y1) == subject["maximum"], subject["label"]
            assert at_y(page, 147, 181, y0, y1) == subject["earned"], subject["label"]
            assert at_y(page, 181, 453, y0, y1) == "", subject["label"]
    else:
        is_retake = "REPECHAGE" in stem
        earlier = fixtures("REPECHAGE-premiere-session") if is_retake else frozen
        for subject in earlier["subjects"]:
            y0, y1 = row_range(page, subject["label"])
            assert at_y(page, 419, 453, y0, y1) == subject["earned"]
            retaken = next(s for s in subjects if s["subjectId"] == subject["subjectId"])
            authorized = is_retake and subject["subjectId"] in earlier["authorized"]
            expected = retaken["components"]["S2"]["components"]["E2"]["earned"] if authorized else ""
            assert at_y(page, 459, 496, y0, y1) == expected
            assert at_y(page, 496, 570, y0, y1) == ""
        y0, y1 = row_range(page, "TOTAUX")
        assert at_y(page, 419, 453, y0, y1) == earlier["identity"]["totalEarned"]
        if is_retake:
            assert at_y(page, 459, 570, y0, y1) == frozen["identity"]["totalEarned"] == "40"

long = documents["secondaire-pagine"]
assert len(long) > 2
text = normal(" ".join(page.get_text() for page in long))
for i, page in enumerate(long):
    if "BRANCHES" in page.get_text():
        assert all(page.search_for(title) for title in secondary_headers)
    assert f"{i + 1} / {len(long)}" in page.get_text()
for name in fixtures("secondaire-pagine")["names"]:
    assert name in text, name
long_name = fixtures("secondaire-pagine")["longName"]
assert re.sub(r"\s+", "", long_name) in re.sub(r"\s+", "", text)
assert "OPTION-FICTIVE" in text
print(f"{len(documents)} documents contrôlés, chaque page rastérisée à 200 ppp.")

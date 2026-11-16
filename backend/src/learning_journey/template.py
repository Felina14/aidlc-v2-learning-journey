"""The fixed five-stage template journey used when the AI cannot deliver one (BR3.2, BR4.1)."""

from __future__ import annotations

from .models import Materials, Stage

TEMPLATE_HOURS = (2, 3, 3, 4, 4)

_TITLES = (
    "Foundations",
    "Core ideas",
    "Hands-on practice",
    "A real project",
    "Mastery and next steps",
)


def build_template(topic: str) -> list[Stage]:
    """Return the five template stages with ``topic`` inserted as plain text.

    The content is identical for every teaching style and passes the same reply checks as an
    AI-written journey (BR2.1 to BR2.3).
    """
    t = topic
    stages = [
        (
            f"Get to know what {t} is and the words people use when they talk about it.",
            f"A clear base makes every later step in {t} easier.",
            f"explain {t} in your own words and name its main parts.",
            f"Read a beginner introduction to {t}.",
            f"Write down five key terms from {t} and what each one means.",
            f"Make a one-page glossary of {t}.",
            f"Explain the basics of {t} to a friend without looking at your notes.",
        ),
        (
            f"Study the main ideas and rules that most of {t} is built on.",
            f"These ideas show up again and again, so knowing them well saves time in {t}.",
            f"describe how the main ideas of {t} fit together.",
            f"Read about the core ideas of {t} from a trusted source.",
            f"Work through two short examples that use the core ideas of {t}.",
            f"Draw a simple diagram of how the core ideas of {t} connect.",
            f"Answer five questions about the core ideas of {t}.",
        ),
        (
            f"Practise {t} with small tasks, so the ideas become habits.",
            f"Doing is how {t} sticks; practice shows what you understand and what you do not.",
            f"finish small tasks in {t} without step-by-step help.",
            f"Read two worked examples of {t} in action.",
            f"Do three practice tasks in {t}, from easy to harder.",
            f"Build a small practice piece that uses {t}.",
            f"Check your practice work in {t} against a worked example.",
        ),
        (
            f"Plan and finish one real project that uses {t} from start to end.",
            f"A real project joins the pieces of {t} and shows what you can do.",
            f"show a finished piece of work that uses {t}.",
            f"Read how others have planned and finished projects in {t}.",
            f"List the steps your {t} project needs and put them in order.",
            f"Finish a project of your choice that uses {t} and share it.",
            f"Review your project and list three things you would do better in {t}.",
        ),
        (
            f"Fill gaps, go deeper where you need to, and choose what to learn next in {t}.",
            f"Looking back shows how far you have come in {t} and where to go next.",
            f"judge your own skill in {t} and choose a clear next goal.",
            f"Read about advanced topics and common mistakes in {t}.",
            f"Pick the weakest area in {t} and do three more tasks on it.",
            f"Write a short plan for what you will learn next in {t}.",
            f"Take a final check of what you know about {t} and note what to revisit.",
        ),
    ]
    result: list[Stage] = []
    for number, (what, why, after, reading, exercise, project, quiz) in enumerate(stages, start=1):
        result.append(
            Stage(
                stage_number=number,
                title=_TITLES[number - 1],
                what_it_is=what,
                why_it_matters=why,
                after_this=f"You can {after}",
                materials=Materials(
                    reading=[reading],
                    exercises=[exercise],
                    mini_project=project,
                    quiz=[quiz],
                ),
                hours=TEMPLATE_HOURS[number - 1],
            )
        )
    return result

from rest_framework import serializers

from apps.questions.models import MCQOption, Question


class MCQOptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = MCQOption
        fields = ["id", "option_text", "is_correct", "order"]
        read_only_fields = ["id"]


class QuestionSerializer(serializers.ModelSerializer):
    options = MCQOptionSerializer(many=True, required=False)
    SUPPORTED_CODING_LANGUAGES = ["python", "javascript", "java", "c", "cpp", "html"]

    class Meta:
        model = Question
        fields = [
            "id",
            "exam",
            "organization",
            "question_text",
            "question_type",
            "problem_statement",
            "input_format",
            "output_format",
            "constraints",
            "sample_test_cases",
            "hidden_test_cases",
            "time_limit_seconds",
            "memory_limit_mb",
            "coding_language",
            "marks",
            "negative_marks",
            "image",
            "order",
            "created_at",
            "options",
        ]
        read_only_fields = ["id", "organization", "created_at"]

    def validate(self, attrs):
        question_type = attrs.get("question_type") or getattr(self.instance, "question_type", None)
        options = attrs.get("options")
        coding_language = attrs.get("coding_language", getattr(self.instance, "coding_language", None))

        problem_statement = attrs.get("problem_statement", getattr(self.instance, "problem_statement", ""))
        input_format = attrs.get("input_format", getattr(self.instance, "input_format", ""))
        output_format = attrs.get("output_format", getattr(self.instance, "output_format", ""))
        constraints = attrs.get("constraints", getattr(self.instance, "constraints", ""))
        sample_test_cases = attrs.get(
            "sample_test_cases",
            getattr(self.instance, "sample_test_cases", []),
        )
        hidden_test_cases = attrs.get(
            "hidden_test_cases",
            getattr(self.instance, "hidden_test_cases", []),
        )
        time_limit_seconds = attrs.get(
            "time_limit_seconds",
            getattr(self.instance, "time_limit_seconds", 3),
        )
        memory_limit_mb = attrs.get(
            "memory_limit_mb",
            getattr(self.instance, "memory_limit_mb", 256),
        )

        if question_type == "mcq" and self.instance is None and not options:
            raise serializers.ValidationError({"options": "MCQ questions require options."})

        if options:
            correct_count = sum(1 for option in options if option.get("is_correct"))
            if question_type == "mcq" and correct_count != 1:
                raise serializers.ValidationError(
                    {"options": "MCQ question must have exactly one correct option."}
                )

        if question_type != "mcq" and options is not None:
            raise serializers.ValidationError({"options": "Options are allowed only for mcq questions."})

        if question_type in ("coding", "dsa"):
            if not coding_language:
                raise serializers.ValidationError(
                    {"coding_language": "Required for coding and DSA questions."}
                )

            if coding_language not in self.SUPPORTED_CODING_LANGUAGES:
                raise serializers.ValidationError({"coding_language": "Unsupported language."})

            if question_type == "dsa" and coding_language == "html":
                raise serializers.ValidationError(
                    {"coding_language": "DSA questions cannot use html language."}
                )

            missing = []
            if not str(problem_statement or "").strip():
                missing.append("problem_statement")
            if not str(input_format or "").strip():
                missing.append("input_format")
            if not str(output_format or "").strip():
                missing.append("output_format")
            if not str(constraints or "").strip():
                missing.append("constraints")

            if missing:
                raise serializers.ValidationError(
                    {
                        field: "This field is required for coding questions."
                        for field in missing
                    }
                )

            if not isinstance(sample_test_cases, list):
                raise serializers.ValidationError(
                    {"sample_test_cases": "sample_test_cases must be a list."}
                )

            requires_sample_cases = coding_language != "html"
            if requires_sample_cases and len(sample_test_cases) == 0:
                raise serializers.ValidationError(
                    {"sample_test_cases": "Provide at least one sample test case."}
                )

            for index, case in enumerate(sample_test_cases):
                if not isinstance(case, dict):
                    raise serializers.ValidationError(
                        {"sample_test_cases": f"Test case at index {index} must be an object."}
                    )

                if "input" not in case or "output" not in case:
                    raise serializers.ValidationError(
                        {
                            "sample_test_cases": (
                                f"Test case at index {index} must include input and output."
                            )
                        }
                    )

                if not str(case.get("output", "")).strip():
                    raise serializers.ValidationError(
                        {
                            "sample_test_cases": (
                                f"Test case at index {index} must have non-empty output."
                            )
                        }
                    )

                if len(str(case.get("output", ""))) > 900:
                    raise serializers.ValidationError(
                        {
                            "sample_test_cases": (
                                "Expected output per test case must be under 900 characters "
                                "due to execution API output limits."
                            )
                        }
                    )

            if question_type == "dsa":
                if not isinstance(hidden_test_cases, list) or len(hidden_test_cases) == 0:
                    raise serializers.ValidationError(
                        {"hidden_test_cases": "DSA questions require at least one hidden test case."}
                    )

                for index, case in enumerate(hidden_test_cases):
                    if not isinstance(case, dict):
                        raise serializers.ValidationError(
                            {"hidden_test_cases": f"Test case at index {index} must be an object."}
                        )

                    if "input" not in case or "output" not in case:
                        raise serializers.ValidationError(
                            {
                                "hidden_test_cases": (
                                    f"Test case at index {index} must include input and output."
                                )
                            }
                        )

                    if not str(case.get("output", "")).strip():
                        raise serializers.ValidationError(
                            {
                                "hidden_test_cases": (
                                    f"Test case at index {index} must have non-empty output."
                                )
                            }
                        )

                    if len(str(case.get("output", ""))) > 900:
                        raise serializers.ValidationError(
                            {
                                "hidden_test_cases": (
                                    "Expected output per hidden test case must be under 900 "
                                    "characters due to execution API output limits."
                                )
                            }
                        )

            if int(time_limit_seconds or 0) < 1 or int(time_limit_seconds or 0) > 10:
                raise serializers.ValidationError(
                    {"time_limit_seconds": "time_limit_seconds must be between 1 and 10."}
                )

            if int(memory_limit_mb or 0) < 32:
                raise serializers.ValidationError(
                    {"memory_limit_mb": "memory_limit_mb must be at least 32."}
                )

        if question_type in ("mcq", "subjective"):
            attrs["problem_statement"] = None
            attrs["input_format"] = None
            attrs["output_format"] = None
            attrs["constraints"] = None
            attrs["sample_test_cases"] = []
            attrs["coding_language"] = None
            attrs["hidden_test_cases"] = []
            attrs["time_limit_seconds"] = 3
            attrs["memory_limit_mb"] = 256

        return attrs

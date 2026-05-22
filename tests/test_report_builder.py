"""Unit tests for the report builder component name formatting utilities."""

import unittest

from report_service.generators.report_builder import (
    _format_component_display_name,
    _get_component_name,
)


class TestReportBuilder(unittest.TestCase):
    """Tests for component name extraction and display formatting."""
    def test_get_component_name_uses_override_mapping(self):
        """Verify override mapping takes precedence over extracted component names."""
        component = {
            "component_id": "XML-1FB5F35B",
            "component_name": "Test Workflow",
            "component_name_source": "extracted",
        }

        result = _get_component_name(component)

        self.assertEqual(result["name"], "Test Workflow")
        self.assertEqual(result["source"], "override")

    def test_get_component_name_falls_back_to_workflow(self):
        """Verify workflow name is used when no explicit component_name exists."""
        component = {
            "component_id": "XML-ABCDEFGH",
            "location": {"workflow": "Real Workflow Name"},
        }

        result = _get_component_name(component)

        self.assertEqual(result["name"], "Real Workflow Name")
        self.assertEqual(result["source"], "workflow")

    def test_get_component_name_uses_filename_for_groovy(self):
        """Verify the extracted groovy filename is returned as the component name."""
        component = {
            "component_id": "GRV-1234ABCD",
            "component_name": "my_script.groovy",
            "component_name_source": "extracted",
        }

        result = _get_component_name(component)

        self.assertEqual(result["name"], "my_script.groovy")
        self.assertEqual(result["source"], "extracted")

    def test_format_component_display_name(self):
        """Verify the component display name combines name and id correctly."""
        component = {
            "component_id": "GRV-1234ABCD",
            "component_name": "my_script.groovy",
            "component_name_source": "extracted",
        }

        result = _format_component_display_name(component)

        self.assertEqual(result, "my_script.groovy (GRV-1234ABCD)")


if __name__ == "__main__":
    unittest.main()

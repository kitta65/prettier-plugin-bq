{{ config() }}
{{ config() }}

SELECT 1;

{{ config() }}

{{ config() }}

SELECT 1;

{# this is leading comment1 #}
/* this is leading comment2 */
SELECT 1; {# this is trailing comment #}

SELECT {{variable}}, {variable};

SELECT
  {% for i in range(10) %}
    -- comment
    {{ i }},
  {% endfor %},
;

SELECT
  {%- for i in range(10) -%} {{ i }}, {%- endfor -%}
  -- comment
  100,
;

SELECT
  {% if true %}
    -- comment
    foo
  {% else %}
    bar
  {% endif %} AS baz,
  100,
;

SELECT {% block exprs %}{% endblock %};

SELECT
  {% for i in range(10) %}
    {% for j in range(10) %}
      -- comment
      {{ i }} + {{ j }},
    {% endfor %}
  {% endfor %}
  100,
;

SELECT *
FROM t
WHERE
  {% if true %}
    foo
  {% else %}
    {# comment #}
    bar
  {% endif %}
  AND baz
;

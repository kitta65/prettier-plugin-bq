{{ config() }}
{{ config() }}

select 1;

{{ config() }}

{{ config() }}

select 1;

{# this is leading comment1 #}
/* this is leading comment2 */
select 1; {# this is trailing comment #}

select {{variable}}, {variable};

select
  {% for i in range(10) %}
    -- comment
    {{ i }},
  {% endfor %}
;

select
  {%- for i in range(10) -%}
    {{ i }},
  {%- endfor -%}
  -- comment
  100,
;

select
  {% if true %}
    -- comment
    foo
  {% else %}
    bar
  {% endif %} as baz,
  100,
;

select {% block exprs %}{% endblock %};

select
  {% for i in range(10) %}
    {% for j in range(10) %}
      -- comment
      {{ i }} + {{ j }},
    {% endfor %}
  {% endfor %}
  100,
;

select *
from t
where
  {% if true %}
    foo
  {% else %}
    {# comment #}
    bar
  {% endif %}
  and baz
;

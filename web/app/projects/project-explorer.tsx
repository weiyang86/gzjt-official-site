'use client';

import { useEffect, useMemo, useRef, useState, type CSSProperties, type FocusEvent, type MouseEvent } from 'react';
import type { Project } from '@/types/cms';
import { projectTypeOptions } from '@/lib/cms/project-types';

type TipState = { text: string; left: number; top: number } | null;

const fallbackProjectImage = '/img/雅砻江大桥.jpg';

const hasCoordinate = (project: Project): project is Project & { mapX: number; mapY: number } => (
  typeof project.mapX === 'number'
  && Number.isFinite(project.mapX)
  && typeof project.mapY === 'number'
  && Number.isFinite(project.mapY)
);

const clampPercent = (value: number) => Math.min(100, Math.max(0, value));

export function ProjectExplorer({ projects }: { projects: Project[] }) {
  const [typeFilter, setTypeFilter] = useState('全部');
  const [locationFilter, setLocationFilter] = useState('全部');
  const [tip, setTip] = useState<TipState>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const typeOptions = useMemo(
    () => Array.from(new Set([...projectTypeOptions, ...projects.map((item) => item.type).filter(Boolean)])),
    [projects],
  );
  const locationOptions = useMemo(() => Array.from(new Set(projects.map((item) => item.location).filter(Boolean))), [projects]);
  const mapProjects = useMemo(() => projects.filter(hasCoordinate), [projects]);
  const filteredProjects = useMemo(() => projects.filter((item) => (
    (typeFilter === '全部' || item.type === typeFilter)
    && (locationFilter === '全部' || item.location === locationFilter)
  )), [projects, typeFilter, locationFilter]);

  useEffect(() => {
    const stage = stageRef.current;
    const image = imageRef.current;
    if (!stage || !image) return;

    const update = () => {
      const width = stage.clientWidth;
      const height = stage.clientHeight;
      if (!width || !height || !image.naturalWidth || !image.naturalHeight) return;
      const scale = Math.min(width / image.naturalWidth, height / image.naturalHeight);
      const fittedWidth = image.naturalWidth * scale;
      const fittedHeight = image.naturalHeight * scale;
      stage.style.setProperty('--fit-left', `${(width - fittedWidth) / 2}px`);
      stage.style.setProperty('--fit-top', `${(height - fittedHeight) / 2}px`);
      stage.style.setProperty('--fit-width', `${fittedWidth}px`);
      stage.style.setProperty('--fit-height', `${fittedHeight}px`);
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(stage);
    image.addEventListener('load', update);
    return () => {
      observer.disconnect();
      image.removeEventListener('load', update);
    };
  }, []);

  const showTip = (event: MouseEvent<HTMLAnchorElement> | FocusEvent<HTMLAnchorElement>, project: Project) => {
    const wrap = mapRef.current;
    if (!wrap) return;
    const wrapRect = wrap.getBoundingClientRect();
    const pointRect = event.currentTarget.getBoundingClientRect();
    setTip({
      text: `${project.name}${project.location ? ` · ${project.location}` : ''}`,
      left: pointRect.left - wrapRect.left + pointRect.width / 2,
      top: pointRect.top - wrapRect.top + pointRect.height / 2,
    });
  };

  return (
    <>
      <section className="section" id="map" aria-label="项目地图">
        <div className="content">
          <div className="section-head reveal is-visible">
            <div>
              <div className="kicker"><i aria-hidden="true" /><span>PROJECT MAP</span></div>
              <div className="h2">项目地图</div>
              <p className="lead">点位来自后台项目数据，悬停查看项目名称，点击进入项目详情。</p>
            </div>
          </div>
          <div className="proj-map reveal is-visible" ref={mapRef}>
            <div className="proj-map-stage" ref={stageRef}>
              <img src="/img/map.png?v=20261025" alt="甘孜州项目分布地图" ref={imageRef} />
              <div className="proj-points">
                {mapProjects.map((project, index) => (
                  <a
                    className="proj-point"
                    href={`/projects/${encodeURIComponent(project.id)}`}
                    key={project.id}
                    style={{ left: `${clampPercent(project.mapX)}%`, top: `${clampPercent(project.mapY)}%`, '--delay': `${index * 0.3}s` } as CSSProperties}
                    aria-label={`${project.name}${project.location ? `（${project.location}）` : ''}`}
                    onMouseEnter={(event) => showTip(event, project)}
                    onMouseLeave={() => setTip(null)}
                    onFocus={(event) => showTip(event, project)}
                    onBlur={() => setTip(null)}
                  >
                    <span className="dot" /><span className="pulse" />
                  </a>
                ))}
              </div>
            </div>
            <div className={`place-tip${tip ? ' is-visible' : ''}`} style={tip ? { left: tip.left, top: tip.top } : undefined} aria-hidden={!tip}>
              {tip?.text || ''}
            </div>
          </div>
          {mapProjects.length ? null : (
            <p className="form-help-text" style={{ marginTop: 12 }}>
              {projects.length
                ? `已有 ${projects.length} 个项目，但均未设置地图坐标；请在后台“项目管理”中选择项目并点击地图设置坐标。`
                : '暂无项目数据，请稍后查看。'}
            </p>
          )}
        </div>
      </section>

      <section className="section" id="list" aria-label="重点项目列表">
        <div className="content">
          <div className="section-head reveal is-visible">
            <div>
              <div className="kicker"><i aria-hidden="true" /><span>PROJECT LIST</span></div>
              <div className="h2">重点项目</div>
              <p className="lead">按类型和位置筛选，点击卡片查看项目详情。</p>
            </div>
          </div>
          <div className="filters reveal is-visible">
            <div className="search" style={{ width: 'auto' }}>
              <select className="select" aria-label="项目类型" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
                <option value="全部">全部类型</option>
                {typeOptions.map((type) => <option value={type} key={type}>{type}</option>)}
              </select>
              <select className="select" aria-label="项目位置" value={locationFilter} onChange={(event) => setLocationFilter(event.target.value)}>
                <option value="全部">全部位置</option>
                {locationOptions.map((location) => <option value={location} key={location}>{location}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <span className="meta">共 {filteredProjects.length} 个项目</span>
            </div>
          </div>
          {filteredProjects.length ? (
            <div className="grid" style={{ marginTop: 18 }}>
              {filteredProjects.map((project) => (
                <a
                  className="card reveal is-visible"
                  href={`/projects/${encodeURIComponent(project.id)}`}
                  key={project.id}
                  style={{ gridColumn: 'span 4', display: 'block' }}
                >
                  <div style={{ height: 180, position: 'relative', overflow: 'hidden' }}>
                    <img src={project.image || fallbackProjectImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,rgba(11,18,32,.06),rgba(11,18,32,.56))' }} />
                  </div>
                  <div className="card-pad">
                    {project.type ? <div className="pill">{project.type}</div> : null}
                    <div style={{ marginTop: 12, fontWeight: 950, letterSpacing: '.3px', fontSize: 16, color: 'rgba(11,18,32,.90)', lineHeight: 1.35 }}>{project.name}</div>
                    <div className="meta" style={{ marginTop: 12 }}>{[project.location, project.progress].filter(Boolean).join(' · ') || '—'}</div>
                    {project.summary ? <div className="rich" style={{ marginTop: 10 }}>{project.summary}</div> : null}
                  </div>
                </a>
              ))}
            </div>
          ) : (
            <div className="detail reveal is-visible" style={{ marginTop: 18 }}>
              <div className="body">
                <p>{projects.length ? '没有符合筛选条件的项目。' : '暂无项目信息，请稍后查看。'}</p>
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  );
}

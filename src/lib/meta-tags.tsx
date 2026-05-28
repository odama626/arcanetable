// version 0.1
import { Meta, Title, useHead } from '@solidjs/meta';
import { useLocation } from '@solidjs/router';
import { ParentProps, splitProps } from 'solid-js';
import orgLd from './json-ld/org.json';

interface MetaTagsProps {
	title?: string;
	image?: string;
	keywords?: string[] | string;
	description?: string;
	ogType?: 'website' | 'article' | 'event';
	jsonLd?: Record<string, unknown>;
}

interface Author {
	name: string;
	url?: string;
	description?: string;
}

const baseURL = import.meta.env.VITE_SITE_URL;

const SITE_DEFAULTS = {
	title: 'Arcanetable - 3D TCG Playtesting in Your Browser',
	image: 'https://arcanetable.app/hero.png',
	url: baseURL,
	keywords: [
		// core product
		'MTG playtesting app',
		'Magic The Gathering online playtesting',
		'3D card game simulator',
		'TCG playtesting platform',
		'browser based MTG playtest',

		// differentiators
		'no download card game simulator',
		'online MTG table simulator',
		'multiplayer MTG playtesting',
		'real-time card game table',
		'MTG deck testing online',

		// supported games
		'Magic The Gathering simulator',
		'Pokemon TCG online simulator',
		'Yu-Gi-Oh online simulator',
		'custom TCG simulator',
		'card game playtesting tool',

		// features
		'MTG deck builder online',
		'virtual card game table',
		'online card game with friends',
		'MTG multiplayer browser game',
		'card game session sharing',
		'invite link card game',

		// use cases
		'playtest MTG deck online',
		'test magic deck before buying',
		'MTG paper deck testing',
		'custom cube playtesting',
		'TCG prototype testing',
	],
	description:
		'The ultimate 3D playtesting platform for Magic: The Gathering and other TCGs. Test your decks, play with friends, and perfect your paper decks — right in your browser.',
};

function getValue(value: string | undefined, defaultValue: string) {
	if (value?.length) return value;
	return defaultValue;
}

export function JsonLd(props: ParentProps & { id: string; content: any }) {
	useHead({
		tag: 'script',
		setting: { close: true, escape: false },
		id: props.id,
		props: {
			type: 'application/ld+json',
			children: JSON.stringify(props.content),
		},
	});
	return null;
}

export default function MetaTags(props: MetaTagsProps) {
	const location = useLocation();
	const title = () => getValue(props.title, SITE_DEFAULTS.title);
	const description = () => getValue(props.description, SITE_DEFAULTS.description);
	const image = () => new URL(props.image || SITE_DEFAULTS.image, baseURL).toString();
	const url = () => new URL(location.pathname || SITE_DEFAULTS.url, baseURL).toString();
	const ogType = () => getValue(props.ogType, 'website');
	const keywords = () => {
		let keywords: string[] | string = props.keywords || SITE_DEFAULTS.keywords;
		if (typeof keywords === 'string') {
			keywords = (keywords as string).split(',').map(keyword => keyword.trim());
		}
		return keywords;
	};

	const jsonLd = () => {
		return {
			'@context': 'https://schema.org',
			'@type': 'WebSite',
			name: title(),
			description: description(),
			url: url(),
			image: image(),
			keywords: keywords(),
			...props.jsonLd,
		};
	};

	return (
		<>
			<Title>{title()}</Title>
			<Meta name='description' content={description()} />
			<Meta name='keywords' content={keywords().join(', ')} />
			<Meta property='og:type' content={ogType()} />
			<Meta property='og:title' content={title()} />
			<Meta property='og:description' content={description()} />
			<Meta property='og:image' content={image()} />
			<Meta property='og:url' content={url()} />
			<Meta name='twitter:card' content='summary_large_image' />
			<Meta name='twitter:title' content={title()} />
			<Meta name='twitter:description' content={description()} />
			<Meta name='twitter:image' content={image()} />
			<JsonLd id='json-ld' content={jsonLd()} />
			<JsonLd id='org-ld' content={orgLd} />
		</>
	);
}

export interface ArticleMetaTagsProps extends Omit<MetaTagsProps, 'ogType' | 'jsonLd'> {
	datePublished?: string;
	dateModified?: string;
	author?: Author;
	articleSection?: string;
}

export function ArticleMetaTags(props: ArticleMetaTagsProps) {
	const jsonLd = () => {
		const articleFields: Record<string, unknown> = {
			'@type': 'Article',
			headline: props.title,
			publisher: {
				'@type': 'Organization',
				name: 'Arcanetable',
				url: baseURL,
				logo: {
					'@type': 'ImageObject',
					url: new URL('/favicon-96x96.png', baseURL).toString(),
				},
			},
		};

		(['datePublished', 'dateModified', 'articleSection'] as const).map(field => {
			if (props[field]) articleFields[field] = props[field];
		});

		if (props.author) {
			articleFields['author'] = {
				'@type': 'Person',
				...splitProps(props.author ?? {}, ['description', 'url', 'name'])[0],
			};
		}

		return articleFields;
	};

	return (
		<>
			<MetaTags
				title={props.title}
				description={props.description}
				image={props.image}
				ogType='article'
				jsonLd={jsonLd()}
			/>
			{props.datePublished && (
				<Meta property='article:published_time' content={props.datePublished} />
			)}
			{props.dateModified && <Meta property='article:modified_time' content={props.dateModified} />}
			{props.author && <Meta property='article:author' content={props.author.name} />}
			{props.articleSection && <Meta property='article:section' content={props.articleSection} />}
		</>
	);
}
